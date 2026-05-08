import { UserRole } from '@nexa/shared';
import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Booking } from './booking.entity';
import { Vehicle } from './vehicle.entity';
import { AuditEntity } from './audit.entity';

@Entity('users')
export class User extends AuditEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'first_name' })
  firstName: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'last_name' })
  lastName: string | null;

  @Index('uq_users_email', { unique: true, where: '"email" IS NOT NULL' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Index('uq_users_phone_number', { unique: true, where: '"phone_number" IS NOT NULL' })
  @Column({ type: 'varchar', length: 20, nullable: true })
  phoneNumber: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordHash: string | null;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ type: 'varchar', length: 100 })
  displayName: string;

  @Column({ type: 'boolean', default: false })
  otpVerified: boolean;

  @OneToMany(() => Vehicle, (v) => v.owner)
  vehicles: Vehicle[];

  @OneToMany(() => Booking, (b) => b.customer)
  bookings: Booking[];
}
