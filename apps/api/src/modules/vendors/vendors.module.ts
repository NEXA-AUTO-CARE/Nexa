import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VendorProfile, User } from '../../database/entities';
import { NotificationsModule } from '../notifications/notifications.module';
import { RolesModule } from '../roles/roles.module';
import { UsersModule } from '../users/users.module';
import { VendorsService } from './vendors.service';
import { VendorsController } from './vendors.controller';
// import { BookingsModule } from '../bookings/bookings.module'; // Will be needed for financials later

@Module({
  imports: [
    TypeOrmModule.forFeature([VendorProfile, User]),
    forwardRef(() => UsersModule),
    RolesModule,
    NotificationsModule,
  ],
  controllers: [VendorsController],
  providers: [VendorsService],
  exports: [VendorsService],
})
export class VendorsModule { }
