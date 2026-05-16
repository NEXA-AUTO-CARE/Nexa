import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('fleet_inquiries')
export class FleetInquiry {
  @PrimaryGeneratedColumn('uuid')
  inquiryId: string;

  @Column()
  companyName: string;

  @Column()
  contactPerson: string;

  @Column()
  fleetSize: string;

  @Column()
  businessEmail: string;

  @Column()
  businessPhone: string;

  @Column({ default: 'PENDING' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;
}
