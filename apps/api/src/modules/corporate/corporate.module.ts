import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CorporateFleetEnquiry } from '../../database/entities';
import { CorporateController } from './corporate.controller';
import { CorporateService } from './corporate.service';

@Module({
  imports: [TypeOrmModule.forFeature([CorporateFleetEnquiry])],
  controllers: [CorporateController],
  providers: [CorporateService],
  exports: [CorporateService],
})
export class CorporateModule {}
