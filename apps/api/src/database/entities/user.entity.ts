import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { AuditEntity } from './audit.entity';
import { Booking } from './booking.entity';
import { Role } from './role.entity';
import { Vehicle } from './vehicle.entity';
import { VendorProfile } from './vendor-profile.entity';

@Entity('users')
export class User extends AuditEntity {
  @PrimaryColumn({ type: 'uuid', name: 'user_id', default: () => 'uuidv7()' })
  userId: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'first_name' })
  firstName: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'last_name' })
  lastName: string | null;

  @Index('uq_users_email', { unique: true, where: '"email" IS NOT NULL' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Index('uq_users_phone_number', {
    unique: true,
    where: '"phone_number" IS NOT NULL',
  })
  @Column({ type: 'varchar', length: 20, nullable: true })
  phoneNumber: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordHash: string | null;

  @Column({ type: 'uuid' })
  roleId: string;

  @ManyToOne(() => Role, (r) => r.users, { onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({ type: 'varchar', length: 100 })
  displayName: string;

  @Column({ type: 'boolean', default: false })
  otpVerified: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'stripe_account_id',
  })
  stripeAccountId: string | null;

  @OneToMany(() => Vehicle, (v) => v.owner)
  vehicles: Vehicle[];

  @OneToMany(() => Booking, (b) => b.customer)
  bookings: Booking[];

  @OneToOne(() => VendorProfile, (vp) => vp.user, { eager: true })
  vendorProfile: VendorProfile;
}
