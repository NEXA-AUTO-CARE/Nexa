import { Column, Entity, PrimaryColumn } from 'typeorm';
import { AuditEntity } from './audit.entity';

@Entity('system_settings')
export class SystemSetting extends AuditEntity {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  key: string;

  @Column({ type: 'text' })
  value: string;
}
