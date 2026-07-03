import { BookingStatus, ServiceType, PaymentStatus } from '@nexa/shared';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { AuditEntity } from './audit.entity';
import { JobPhoto } from './job-photo.entity';
import { Payment } from './payment.entity';
import { Promotion } from './promotion.entity';
import { Review } from './review.entity';
import { User } from './user.entity';
import { Vehicle } from './vehicle.entity';

@Entity('bookings')
export class Booking extends AuditEntity {
  @PrimaryColumn({
    type: 'uuid',
    name: 'booking_id',
    default: () => 'uuidv7()',
  })
  bookingId: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  bookingReference: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (u) => u.bookings, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  customer: User;

  @Column({ type: 'uuid' })
  vehicleId: string;

  @ManyToOne(() => Vehicle, (v) => v.bookings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle;

  @Column({ type: 'uuid', nullable: true })
  vendorId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'vendor_id' })
  vendor: User | null;

  @Column({ type: 'enum', enum: ServiceType })
  serviceType: ServiceType;

  @Column({ type: 'timestamptz' })
  bookingTime: Date;

  @Column({ type: 'text' })
  serviceAddress: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: string;

  @Column({ type: 'jsonb', nullable: true, default: [] })
  addons: { addonId: string; name: string; price: string }[];

  @Column({ type: 'boolean', default: false })
  agreedSafeSpace: boolean;

  @Column({ type: 'boolean', default: false })
  agreedDetailsCorrect: boolean;

  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.BOOKED })
  status: BookingStatus;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  paymentStatus: PaymentStatus;

  @OneToOne(() => Payment, (p) => p.booking)
  payment: Payment | null;

  @OneToMany(() => JobPhoto, (p) => p.booking)
  photos: JobPhoto[];

  @OneToOne(() => Review, (r) => r.booking)
  review: Review | null;

  /* ---- Promotion tracking ---- */

  @Column({ type: 'uuid', nullable: true })
  promotionId: string | null;

  @ManyToOne(() => Promotion, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'promotion_id' })
  promotion: Promotion | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  originalPrice: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  discountAmount: string | null;

  /* ---- Service Phone ---- */
  @Column({ type: 'varchar', length: 30, nullable: true })
  servicePhone: string | null;

  /* ---- Verified Address Details ---- */
  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'address_line_1',
  })
  addressLine1: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'address_line_2',
  })
  addressLine2: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'address_line_3',
  })
  addressLine3: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'post_town' })
  postTown: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'postcode' })
  postcode: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'uprn' })
  uprn: string | null;
}
