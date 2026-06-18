import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { AuditEntity } from './audit.entity';
import { User } from './user.entity';

export enum VendorApprovalStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

@Entity('vendor_profiles')
export class VendorProfile extends AuditEntity {
  @PrimaryColumn({ type: 'uuid', name: 'vendor_id' })
  vendorId: string;

  @OneToOne(() => User, (u) => u.vendorProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendor_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: VendorApprovalStatus,
    default: VendorApprovalStatus.PENDING,
    name: 'approval_status',
  })
  approvalStatus: VendorApprovalStatus;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'company_name',
  })
  companyName: string | null;

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
