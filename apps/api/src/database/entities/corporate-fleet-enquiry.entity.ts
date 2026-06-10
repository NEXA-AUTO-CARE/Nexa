import { Column, Entity, PrimaryColumn } from 'typeorm';
import { AuditEntity } from './audit.entity';

@Entity('corporate_fleet_enquiries')
export class CorporateFleetEnquiry extends AuditEntity {
  @PrimaryColumn({
    type: 'uuid',
    name: 'enquiry_id',
    default: () => 'uuidv7()',
  })
  enquiryId: string;

  @Column({ type: 'varchar', length: 150 })
  companyName: string;

  @Column({ type: 'int' })
  fleetSize: number;

  @Column({ type: 'varchar', length: 120 })
  contactPerson: string;

  @Column({ type: 'varchar', length: 255 })
  businessEmail: string;

  @Column({ type: 'varchar', length: 30 })
  businessPhone: string;

  @Column({ type: 'varchar', length: 20, default: 'new' })
  status: 'new' | 'invoiced';
}
