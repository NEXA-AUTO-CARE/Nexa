import { PaymentStatus } from '@nexa/shared';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { AuditEntity } from './audit.entity';
import { Booking } from './booking.entity';

@Entity('payments')
export class Payment extends AuditEntity {
  @PrimaryColumn({
    type: 'uuid',
    name: 'payment_id',
    default: () => 'uuidv7()',
  })
  paymentId: string;

  @Index('uq_payments_booking', { unique: true })
  @Column({ type: 'uuid' })
  bookingId: string;

  @OneToOne(() => Booking, (b) => b.payment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ type: 'varchar', length: 255 })
  stripePaymentIntentId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  platformFee: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  vendorPayout: string;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ type: 'timestamptz', nullable: true })
  paidOutAt: Date | null;
}
