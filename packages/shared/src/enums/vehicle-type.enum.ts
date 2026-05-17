/**
 * Billable vehicle categories. Each category maps 1:1 to a Mini Valet price
 * (see MINI_VALET_PRICING in ../pricing).
 */
export const VehicleType = {
  REGULAR: 'regular',
  SEVEN_SEATER_4X4: 'seven_seater_4x4',
  SMALL_VAN: 'small_van',
  LARGE_VAN: 'large_van',
} as const;
export type VehicleType = (typeof VehicleType)[keyof typeof VehicleType];
