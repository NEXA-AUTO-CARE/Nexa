import { VehicleType } from './enums/vehicle-type.enum.js';

/**
 * Mini Valet & Spray Polish is the single base service. Price is determined
 * solely by the vehicle category. Add-ons are charged on top.
 * Source of truth shared by the API (price calc) and web (display).
 */
export const MINI_VALET_PRICING = {} as Record<VehicleType, string>;

export const VEHICLE_CATEGORY_LABELS = {} as Record<VehicleType, string>;

export const VEHICLE_CATEGORY_DESCRIPTIONS = {} as Record<VehicleType, string>;

export const BOOKING_FEE = '0.00';

/**
 * Service label defaults. Stored in system_settings under key `service_labels`.
 * The `base` key is the main service name displayed app-wide.
 */
export const SERVICE_LABELS = {} as Record<string, string>;

