import type { ServiceType } from '../../enums/service-type.enum.js';

export interface CreateBookingDto {
  vehicleId: string;
  serviceType: ServiceType;
  bookingTime: string; // ISO 8601
  serviceAddress: string;
  latitude?: number | null;
  longitude?: number | null;
  addonIds?: string[];
}
