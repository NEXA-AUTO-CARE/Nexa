
export interface CreateVehicleDto {
  registrationNumber: string;
  make: string;
  model: string;
  vehicleType: string;
  colour?: string | null;
}
