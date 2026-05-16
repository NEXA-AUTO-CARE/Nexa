export const VehicleType = {
  CAR: 'car',
  SUV: 'suv',
  SMALL_VAN: 'small_van',
  LARGE_VAN: 'large_van',
  OTHER: 'other',
} as const;
export type VehicleType = (typeof VehicleType)[keyof typeof VehicleType];
