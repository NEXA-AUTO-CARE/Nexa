import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { AuditEntity } from './audit.entity';

@Entity('otp_codes')
@Index('idx_otp_codes_identifier', ['identifier'])
export class OtpCode extends AuditEntity {
  @PrimaryColumn({ type: 'uuid', name: 'id', default: () => 'uuidv7()' })
  id: string;

  @Column({ type: 'varchar', length: 255 })
  identifier: string;

  @Column({ type: 'varchar', length: 6 })
  code: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  consumedAt: Date | null;
}
