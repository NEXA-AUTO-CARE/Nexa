import type { BookingStatus } from '../../enums/booking-status.enum.js';
import type { ServiceType } from '../../enums/service-type.enum.js';

export interface BookingResponse {
  bookingId: string;
  vehicleId: string;
  vehicleSummary: string; // e.g. "2020 Toyota Camry (ABC-123)"
  serviceType: ServiceType;
  bookingTime: string;
  serviceAddress: string;
  latitude?: number;
  longitude?: number;
  price: string;
  status: BookingStatus;
  createdAt: string;
  servicePhone?: string;
  addons?: { addonId: string; name: string; price: string }[];
  /** Pre-discount price; present only when a promotion was applied. */
  originalPrice?: string;
  /** The £ amount discounted; present only when a promotion was applied. */
  discountAmount?: string;
  /** Name of the promotion that was applied. */
  promotionTitle?: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  addressLine3?: string | null;
  postTown?: string | null;
  postcode?: string | null;
  uprn?: string | null;
}
