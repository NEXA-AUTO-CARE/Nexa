import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { UsersModule } from '../users/users.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { AdminBookingsController } from './admin-bookings.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminVehiclesController } from './admin-vehicles.controller';

@Module({
  imports: [BookingsModule, UsersModule, VehiclesModule],
  controllers: [
    AdminBookingsController,
    AdminUsersController,
    AdminVehiclesController,
  ],
})
export class AdminModule {}
