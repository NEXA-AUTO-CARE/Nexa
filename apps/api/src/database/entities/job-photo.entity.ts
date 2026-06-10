import { PhotoType } from '@nexa/shared';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { AuditEntity } from './audit.entity';
import { Booking } from './booking.entity';
import { User } from './user.entity';

@Entity('job_photos')
export class JobPhoto extends AuditEntity {
  @PrimaryColumn({ type: 'uuid', name: 'photo_id', default: () => 'uuidv7()' })
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
}
