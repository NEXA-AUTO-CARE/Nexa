import type { VehicleType } from '../../enums/vehicle-type.enum.js';

export interface VehicleResponse {
  vehicleId: string;
  registrationNumber: string;
  make: string;
  model: string;
  vehicleType: VehicleType;
  colour: string | null;
  createdAt: string;
}
