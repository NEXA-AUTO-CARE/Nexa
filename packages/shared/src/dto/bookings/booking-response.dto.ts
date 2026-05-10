import type { BookingStatus } from '../../enums/booking-status.enum.js';
import type { ServiceType } from '../../enums/service-type.enum.js';

export interface BookingResponse {
  bookingId: string;
  vehicleId: string;
  vehicleSummary: string; // e.g. "BMW 3 Series (AB12CDE)"
  serviceType: ServiceType;
  bookingTime: string;
  serviceAddress: string;
  price: string;
  status: BookingStatus;
  createdAt: string;
}
