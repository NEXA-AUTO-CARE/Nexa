import type { ServiceType } from '../../enums/service-type.enum.js';

export interface CreateBookingDto {
  vehicleId: string;
  /** Optional: Mini Valet is the only base service. Defaults to BASIC. */
  serviceType?: ServiceType;
  bookingTime: string; // ISO 8601
  serviceAddress: string;
  servicePhone: string;
  latitude?: number | null;
  longitude?: number | null;
  addonIds?: string[];
  /** Legal consent — both must be true before a booking (and payment) can proceed. */
  agreedSafeSpace: boolean;
  agreedDetailsCorrect: boolean;
  addressLine1?: string | null;
  addressLine2?: string | null;
  addressLine3?: string | null;
  postTown?: string | null;
  postcode?: string | null;
  uprn?: string | null;
}

export interface RebookDto {
  /** ISO 8601. Optional — defaults to 24h from now if omitted. */
  bookingTime?: string;
}
