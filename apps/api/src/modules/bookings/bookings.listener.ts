import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MessageTemplateService } from '../notifications/message-template.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  BOOKING_GENERIC_FALLBACK,
  DEFAULT_BOOKING_TEMPLATES,
  NOTIFICATION_TEMPLATES_KEY,
} from '../notifications/templates/booking.templates';
import type { BookingNotificationContext } from '../notifications/templates/booking.templates';
import { BookingCreatedEvent, BookingStatusChangedEvent } from './events/booking.events';

const SERVICE_LABELS: Record<string, string> = {
  basic: 'Basic Wash',
  full: 'Full Detail',
  premium: 'Premium Detail',
};

@Injectable()
export class BookingsListener {
  private readonly logger = new Logger(BookingsListener.name);

  constructor(
    private readonly notifications: NotificationsService,
    private readonly templateService: MessageTemplateService,
  ) {}

  @OnEvent(BookingCreatedEvent.EVENT_NAME)
  async handleCreated(event: BookingCreatedEvent): Promise<void> {
    const { booking } = event;
    const customer = booking.customer;
    if (!customer) {
      this.logger.warn(`No customer relation on booking ${booking.bookingId}`);
      return;
    }

    const ctx = this.buildContext(booking);
    const content = await this.processBookingTemplate(ctx);

    this.logger.log(`[EVENT] booking.created → notifying ${customer.displayName}`);
    await this.notifications.notify(customer, content);
  }

  @OnEvent(BookingStatusChangedEvent.EVENT_NAME)
  async handleStatusChanged(event: BookingStatusChangedEvent): Promise<void> {
    const { booking, previousStatus } = event;
    const customer = booking.customer;
    if (!customer) {
      this.logger.warn(`No customer relation on booking ${booking.bookingId}`);
      return;
    }

    const ctx = this.buildContext(booking);
    const content = await this.processBookingTemplate(ctx);

    this.logger.log(
      `[EVENT] booking.status_changed (${previousStatus} → ${booking.status}) → notifying ${customer.displayName}`,
    );
    await this.notifications.notify(customer, content);
  }

  /**
   * Use MessageTemplateService to load overrides, resolve the template,
   * and build the email + SMS content — with an extra detail card for bookings.
   */
  private async processBookingTemplate(
    ctx: BookingNotificationContext,
  ): Promise<{ subject: string; html: string; smsText: string }> {
    const overrides = await this.templateService.loadOverrides(NOTIFICATION_TEMPLATES_KEY);
    const tpl = this.templateService.resolveTemplate(
      ctx.status,
      DEFAULT_BOOKING_TEMPLATES,
      overrides,
      BOOKING_GENERIC_FALLBACK,
    );

    const flatCtx: Record<string, string> = {
      customerName: ctx.customerName,
      bookingId: ctx.bookingId,
      vehicleSummary: ctx.vehicleSummary,
      serviceType: ctx.serviceType,
      bookingTime: ctx.bookingTime,
      status: ctx.status,
    };

    const detailCard = `
      <div style="margin-top: 24px; padding: 16px; background: #1a2332; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);">
        <p style="margin: 4px 0; color: #94A3B8;"><strong style="color: #fff;">Vehicle:</strong> ${ctx.vehicleSummary}</p>
        <p style="margin: 4px 0; color: #94A3B8;"><strong style="color: #fff;">Service:</strong> ${ctx.serviceType}</p>
        <p style="margin: 4px 0; color: #94A3B8;"><strong style="color: #fff;">Date:</strong> ${ctx.bookingTime}</p>
      </div>
    `;

    const { subject, html } = this.templateService.buildEmail(tpl, flatCtx, detailCard);
    const smsText = this.templateService.buildSms(tpl, flatCtx);
    return { subject, html, smsText };
  }

  private buildContext(booking: import('../../database/entities').Booking): BookingNotificationContext {
    const v = booking.vehicle;
    return {
      customerName: booking.customer?.displayName ?? 'Customer',
      bookingId: booking.bookingId,
      vehicleSummary: v
        ? `${v.make} ${v.model} (${v.registrationNumber})`
        : 'Your vehicle',
      serviceType: SERVICE_LABELS[booking.serviceType] ?? booking.serviceType,
      bookingTime: booking.bookingTime.toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      status: booking.status,
    };
  }
}
