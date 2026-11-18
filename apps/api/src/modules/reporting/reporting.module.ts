import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Booking,
  CorporateFleetEnquiry,
  VendorProfile,
} from '../../database/entities';
import { ReportingController } from './reporting.controller';
import { ReportingService } from './reporting.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, VendorProfile, CorporateFleetEnquiry]),
  ],
  controllers: [ReportingController],
  providers: [ReportingService],
  exports: [ReportingService],
})
export class ReportingModule {}
