import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { UsersModule } from '../users/users.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { AdminBookingsController } from './admin-bookings.controller';
import { AdminPromotionsController } from './admin-promotions.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminVehiclesController } from './admin-vehicles.controller';

@Module({
  imports: [BookingsModule, UsersModule, VehiclesModule, PromotionsModule],
  controllers: [
    AdminBookingsController,
    AdminUsersController,
    AdminVehiclesController,
    AdminPromotionsController,
  ],
})
export class AdminModule {}
