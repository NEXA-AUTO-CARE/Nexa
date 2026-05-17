import { VehicleType } from './enums/vehicle-type.enum.js';

/**
 * Mini Valet & Spray Polish is the single base service. Price is determined
 * solely by the vehicle category. Add-ons are charged on top.
 * Source of truth shared by the API (price calc) and web (display).
 */
export const MINI_VALET_PRICING: Record<VehicleType, string> = {
  [VehicleType.REGULAR]: '25.00',
  [VehicleType.SEVEN_SEATER_4X4]: '30.00',
  [VehicleType.SMALL_VAN]: '35.00',
  [VehicleType.LARGE_VAN]: '40.00',
};

export const VEHICLE_CATEGORY_LABELS: Record<VehicleType, string> = {
  [VehicleType.REGULAR]: 'Regular car',
  [VehicleType.SEVEN_SEATER_4X4]: '7 Seater & 4x4',
  [VehicleType.SMALL_VAN]: 'Small Van',
  [VehicleType.LARGE_VAN]: 'Large Van',
};
