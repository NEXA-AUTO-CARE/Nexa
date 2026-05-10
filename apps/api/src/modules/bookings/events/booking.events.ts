import type { BookingStatus } from '@nexa/shared';
import type { Booking } from '../../../database/entities';

export class BookingCreatedEvent {
  static readonly EVENT_NAME = 'booking.created' as const;
  constructor(public readonly booking: Booking) {}
}

export class BookingStatusChangedEvent {
  static readonly EVENT_NAME = 'booking.status_changed' as const;
  constructor(
    public readonly booking: Booking,
    public readonly previousStatus: BookingStatus,
  ) {}
}

export class BookingCancelledEvent {
  static readonly EVENT_NAME = 'booking.cancelled' as const;
  constructor(public readonly booking: Booking) {}
}
