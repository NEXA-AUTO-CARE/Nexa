import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FleetInquiry } from '../../database/entities/fleet-inquiry.entity';
import { FleetController } from './fleet.controller';
import { FleetService } from './fleet.service';

@Module({
  imports: [TypeOrmModule.forFeature([FleetInquiry])],
  controllers: [FleetController],
  providers: [FleetService],
})
export class FleetModule {}
