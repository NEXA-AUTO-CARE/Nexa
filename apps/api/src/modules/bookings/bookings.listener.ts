import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MessageTemplateService } from '../notifications/message-template.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  NOTIFICATION_TEMPLATES_KEY,
} from '../notifications/templates/booking.templates';
import type { BookingNotificationContext } from '../notifications/templates/booking.templates';
import {
  BookingCreatedEvent,
  BookingStatusChangedEvent,
} from './events/booking.events';

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

    const content = await this.processBookingTemplate(
      this.buildContext(booking),
    );

    this.logger.log(
      `[EVENT] booking.created → notifying ${customer.displayName}`,
    );
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

    const content = await this.processBookingTemplate(
      this.buildContext(booking),
    );

    this.logger.log(
      `[EVENT] booking.status_changed (${previousStatus} → ${booking.status}) → notifying ${customer.displayName}`,
    );
    await this.notifications.notify(customer, content);
  }

  /**
   * Load templates from the database (the single source of truth).
   * A minimal generic fallback is used only as a safety net if the
   * DB row is missing entirely — this is NOT a parallel template store.
   */
  private async processBookingTemplate(
    ctx: BookingNotificationContext,
  ): Promise<{ subject: string; html: string; smsText: string }> {
    const dbTemplates = await this.templateService.loadOverrides(
      NOTIFICATION_TEMPLATES_KEY,
    );

    const genericFallback = {
      title: 'Booking Update',
      emailBody:
        'Your booking (Ref: {{bookingRef}}) has been updated to: {{status}}.',
      smsBody:
        'NEXA: Your booking (Ref: {{bookingRef}}) has been updated.',
    };

    const tpl = dbTemplates?.[ctx.status] ?? genericFallback;

    const flatCtx: Record<string, string> = {
      customerName: ctx.customerName,
      bookingId: ctx.bookingId,
      bookingRef: ctx.bookingRef,
      vehicleSummary: ctx.vehicleSummary,
      serviceType: ctx.serviceType,
      bookingTime: ctx.bookingTime,
      status: ctx.status,
      transactionRef: ctx.transactionRef,
    };

    const detailCard = `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 24px; background-color: #1a2332; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);">
        <tr>
          <td style="padding: 16px; font-family: 'Inter', Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.8; color: #94A3B8;">
            <strong style="color: #ffffff;">Booking Ref:</strong> ${ctx.bookingRef}<br/>
            <strong style="color: #ffffff;">Vehicle:</strong> ${ctx.vehicleSummary}<br/>
            <strong style="color: #ffffff;">Service:</strong> ${ctx.serviceType}<br/>
            <strong style="color: #ffffff;">Date:</strong> ${ctx.bookingTime}
          </td>
        </tr>
      </table>
    `;

    const { subject, html } = this.templateService.buildEmail(
      tpl,
      flatCtx,
      detailCard,
    );
    const smsText = this.templateService.buildSms(tpl, flatCtx);
    return { subject, html, smsText };
  }

  private buildContext(
    booking: import('../../database/entities').Booking,
  ): BookingNotificationContext {
    const v = booking.vehicle;
    return {
      customerName: booking.customer?.displayName ?? 'Customer',
      bookingId: booking.bookingId,
      bookingRef: booking.bookingReference ?? booking.bookingId.split('-')[0].toUpperCase(),
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
      transactionRef: booking.payment?.transactionReference ?? 'N/A',
    };
  }
}
