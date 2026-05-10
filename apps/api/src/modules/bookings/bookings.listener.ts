import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from '../notifications/notifications.service';
import {
  getBookingEmailHtml,
  getBookingSmsText,
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

  constructor(private readonly notifications: NotificationsService) {}

  @OnEvent(BookingCreatedEvent.EVENT_NAME)
  async handleCreated(event: BookingCreatedEvent): Promise<void> {
    const { booking } = event;
    const customer = booking.customer;
    if (!customer) {
      this.logger.warn(`No customer relation on booking ${booking.bookingId}`);
      return;
    }

    const ctx = this.buildContext(booking);
    const { subject, html } = getBookingEmailHtml(ctx);
    const smsText = getBookingSmsText(ctx);

    this.logger.log(`[EVENT] booking.created → notifying ${customer.displayName}`);
    await this.notifications.notify(customer, { subject, html, smsText });
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
    const { subject, html } = getBookingEmailHtml(ctx);
    const smsText = getBookingSmsText(ctx);

    this.logger.log(
      `[EVENT] booking.status_changed (${previousStatus} → ${booking.status}) → notifying ${customer.displayName}`,
    );
    await this.notifications.notify(customer, { subject, html, smsText });
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
