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

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'company_name' })
  companyName: string | null;
}
