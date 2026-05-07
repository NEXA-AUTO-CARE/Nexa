import { Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export abstract class AuditEntity {
  @CreateDateColumn({ type: 'timestamptz', name: 'created_on' })
  createdOn: Date;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'created_by' })
  createdBy: string | null;

  @UpdateDateColumn({ type: 'timestamptz', nullable: true, name: 'updated_on' })
  updatedOn: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'updated_by' })
  updatedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'approved_on' })
  approvedOn: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'approved_by' })
  approvedBy: string | null;
}
