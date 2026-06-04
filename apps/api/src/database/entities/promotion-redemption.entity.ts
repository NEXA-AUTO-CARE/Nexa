import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Booking } from './booking.entity';
import { Promotion } from './promotion.entity';
import { User } from './user.entity';

@Entity('promotion_redemptions')
@Index('IDX_redemption_promo_user', ['promotionId', 'userId'])
export class PromotionRedemption {
  @PrimaryColumn({ type: 'uuid', name: 'redemption_id', default: () => 'uuidv7()' })
  redemptionId: string;

  @Column({ type: 'uuid' })
  promotionId: string;

  @ManyToOne(() => Promotion, (p) => p.redemptions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'promotion_id' })
  promotion: Promotion;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid' })
  bookingId: string;

  @ManyToOne(() => Booking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount: string;

  @Column({ type: 'boolean', default: false })
  isFreeBooking: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'redeemed_at' })
  redeemedAt: Date;
}
