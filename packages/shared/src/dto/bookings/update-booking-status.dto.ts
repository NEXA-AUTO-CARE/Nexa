import type { BookingStatus } from '../../enums/booking-status.enum.js';

export interface UpdateBookingStatusDto {
  status: BookingStatus;
}
