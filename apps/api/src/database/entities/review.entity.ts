import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { AuditEntity } from './audit.entity';
import { Booking } from './booking.entity';
import { User } from './user.entity';

@Entity('reviews')
@Check('"rating" BETWEEN 1 AND 5')
export class Review extends AuditEntity {
  @PrimaryColumn({ type: 'uuid', name: 'review_id', default: () => 'uuidv7()' })
  reviewId: string;

  @Index('uq_reviews_booking', { unique: true })
  @Column({ type: 'uuid' })
  bookingId: string;

  @OneToOne(() => Booking, (b) => b.review, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  customer: User;

  @Column({ type: 'uuid' })
  vendorId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'vendor_id' })
  vendor: User;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string | null;
}
