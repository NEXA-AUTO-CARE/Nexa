import { VehicleType } from './enums/vehicle-type.enum.js';

/**
 * Mini Valet & Spray Polish is the single base service. Price is determined
 * solely by the vehicle category. Add-ons are charged on top.
 * Source of truth shared by the API (price calc) and web (display).
 */
export const MINI_VALET_PRICING: Record<VehicleType, string> = {
  [VehicleType.STANDARD]: '25.00',
  [VehicleType.GRANDE]: '30.00',
  [VehicleType.MAXI]: '35.00',
  [VehicleType.TRANSIT]: '40.00',
};

export const VEHICLE_CATEGORY_LABELS: Record<VehicleType, string> = {
  [VehicleType.STANDARD]: 'Standard',
  [VehicleType.GRANDE]: 'Grande',
  [VehicleType.MAXI]: 'Maxi',
  [VehicleType.TRANSIT]: 'Transit',
};

export const VEHICLE_CATEGORY_DESCRIPTIONS: Record<VehicleType, string> = {
  [VehicleType.STANDARD]: 'Hatchbacks, Saloons, Coupes, City Cars',
  [VehicleType.GRANDE]: 'Estate cars, MPVs, Crossovers, Mid-size SUVs (e.g. Ford Kuga, VW Tiguan, Toyota RAV4, Volvo V60 Estate)',
  [VehicleType.MAXI]: 'Large SUVs, Full-size 4x4s, Minivans (e.g. Land Rover Defender, BMW X7, Ford Galaxy, Mercedes V-Class)',
  [VehicleType.TRANSIT]: 'mid commercial vans and equivalent-sized vehicles (e.g., Ford Transit Custom, VW Transporter, Vauxhall Vivaro, Renault Trafic, Mercedes Vito)',
};

export const BOOKING_FEE = '1.49';

