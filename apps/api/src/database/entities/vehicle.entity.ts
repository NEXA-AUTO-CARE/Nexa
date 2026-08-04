
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  Unique,
} from 'typeorm';
import { AuditEntity } from './audit.entity';
import { Booking } from './booking.entity';
import { User } from './user.entity';

@Entity('vehicles')
@Unique(['ownerId', 'registrationNumber'])
export class Vehicle extends AuditEntity {
  @PrimaryColumn({
    type: 'uuid',
    name: 'vehicle_id',
    default: () => 'uuidv7()',
  })
  vehicleId: string;

  @Column({ type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => User, (u) => u.vehicles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column({ type: 'varchar', length: 15 })
  registrationNumber: string;

  @Column({ type: 'varchar', length: 50 })
  make: string;

  @Column({ type: 'varchar', length: 50 })
  model: string;

  @Column({ type: 'varchar', length: 50 })
  vehicleType: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  colour: string | null;

  @OneToMany(() => Booking, (b) => b.vehicle)
  bookings: Booking[];
}
