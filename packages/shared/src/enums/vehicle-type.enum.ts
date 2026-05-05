export const VehicleType = {
  CAR: 'car',
  VAN: 'van',
  SUV: 'suv',
  OTHER: 'other',
} as const;
export type VehicleType = (typeof VehicleType)[keyof typeof VehicleType];
