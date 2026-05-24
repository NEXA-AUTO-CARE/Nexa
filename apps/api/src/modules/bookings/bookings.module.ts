import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking, Vehicle, ServiceAddon, Review } from '../../database/entities';
import { NotificationsModule } from '../notifications/notifications.module';
import { BookingsController } from './bookings.controller';
import { BookingsListener } from './bookings.listener';
import { BookingsService } from './bookings.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, Vehicle, ServiceAddon, Review]),
    NotificationsModule,
    SettingsModule,
  ],
  providers: [BookingsService, BookingsListener],
  controllers: [BookingsController],
  exports: [BookingsService],
})
export class BookingsModule {}
