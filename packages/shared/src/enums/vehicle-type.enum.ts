/**
 * Billable vehicle categories. Each category maps 1:1 to a Mini Valet price
 * (see MINI_VALET_PRICING in ../pricing).
 */
export const VehicleType = {
  STANDARD: 'standard',
  GRANDE: 'grande',
  MAXI: 'maxi',
  TRANSIT: 'transit',
} as const;
export type VehicleType = (typeof VehicleType)[keyof typeof VehicleType];

