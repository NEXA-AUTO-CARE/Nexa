import { PhotoType } from '@nexa/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Booking } from './booking.entity';
import { User } from './user.entity';

@Entity('job_photos')
export class JobPhoto {
  @PrimaryGeneratedColumn('uuid', { name: 'photo_id' })
  photoId: string;

  @Column({ type: 'uuid' })
  bookingId: string;

  @ManyToOne(() => Booking, (b) => b.photos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ type: 'uuid' })
  vendorId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'vendor_id' })
  vendor: User;

  @Column({ type: 'enum', enum: PhotoType })
  photoType: PhotoType;

  @Column({ type: 'text' })
  storageUrl: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'uploaded_at' })
  uploadedAt: Date;
}
