import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { User } from './user.entity';

/**
 * Immutable audit trail log entry. Every significant admin action
 * creates one row — nothing is overwritten.
 */
@Entity('audit_trail')
export class AuditTrail {
  @PrimaryColumn({
    type: 'uuid',
    name: 'audit_id',
    default: () => 'uuidv7()',
  })
  auditId: string;

  /** The admin user who performed the action. */
  @Index('idx_audit_trail_actor')
  @Column({ type: 'uuid' })
  actorId: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'actor_id' })
  actor: User | null;

  /** Broad category, e.g. "BOOKING", "PAYMENT". */
  @Index('idx_audit_trail_entity')
  @Column({ type: 'varchar', length: 50 })
  entityType: string;

  /** Primary key of the affected entity. */
  @Column({ type: 'uuid' })
  entityId: string;

  /** Human-readable label, e.g. "UPDATE_STATUS", "ASSIGN_VENDOR", "REFUND". */
  @Index('idx_audit_trail_action')
  @Column({ type: 'varchar', length: 80 })
  action: string;

  /** Snapshot of the old values before the change (JSONB). */
  @Column({ type: 'jsonb', nullable: true })
  oldValues: Record<string, unknown> | null;

  /** Snapshot of the new values after the change (JSONB). */
  @Column({ type: 'jsonb', nullable: true })
  newValues: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'performed_at' })
  performedAt: Date;
}
