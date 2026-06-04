import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Promotion, PromotionRedemption } from '../../database/entities';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { PromotionsListener } from './promotions.listener';
import { PromotionsService } from './promotions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Promotion, PromotionRedemption]),
    NotificationsModule,
    UsersModule,
  ],
  providers: [PromotionsService, PromotionsListener],
  exports: [PromotionsService],
})
export class PromotionsModule {}
