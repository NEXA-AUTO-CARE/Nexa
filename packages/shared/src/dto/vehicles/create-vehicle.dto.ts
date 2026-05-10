import type { VehicleType } from '../../enums/vehicle-type.enum.js';

export interface CreateVehicleDto {
  registrationNumber: string;
  make: string;
  model: string;
  vehicleType: VehicleType;
  colour?: string | null;
}
