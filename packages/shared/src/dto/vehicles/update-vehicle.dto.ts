import type { VehicleType } from '../../enums/vehicle-type.enum.js';

export interface UpdateVehicleDto {
  registrationNumber?: string;
  make?: string;
  model?: string;
  vehicleType?: VehicleType;
  colour?: string | null;
}
