import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { BookingsModule } from '../bookings/bookings.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { UsersModule } from '../users/users.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { AdminBookingsController } from './admin-bookings.controller';
import { AdminPromotionsController } from './admin-promotions.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminVehiclesController } from './admin-vehicles.controller';
import { AdminVendorsController } from './admin-vendors.controller';
import { VendorsModule } from '../vendors/vendors.module';

@Module({
  imports: [
    BookingsModule,
    UsersModule,
    VehiclesModule,
    PromotionsModule,
    VendorsModule,
    PaymentsModule,
  ],
  controllers: [
    AdminBookingsController,
    AdminUsersController,
    AdminVehiclesController,
    AdminPromotionsController,
    AdminVendorsController,
  ],
})
export class AdminModule {}
