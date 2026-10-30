import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

export type NotificationChannelType =
  | 'email'
  | 'sms'
  | 'whatsapp'
  | 'sns_topic';
export type NotificationDeliveryStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'failed';

@Entity('notification_logs')
export class NotificationLog {
  @PrimaryColumn({
    type: 'uuid',
    name: 'log_id',
    default: () => 'uuidv7()',
  })
  logId: string;

  @Index('idx_notification_logs_user_id')
  @Column({ type: 'uuid', name: 'user_id', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ type: 'varchar', length: 255 })
  recipient: string;

  @Column({ type: 'varchar', length: 50 })
  channel: NotificationChannelType;

  @Column({ type: 'varchar', length: 50 })
  provider: string; // 'aws_sns' | 'twilio' | 'aws_ses' | 'smtp'

  @Index('idx_notification_logs_provider_msg_id')
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'provider_message_id',
  })
  providerMessageId: string | null;

  @Index('idx_notification_logs_status')
  @Column({ type: 'varchar', length: 50, default: 'sent' })
  status: NotificationDeliveryStatus;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'event_type' })
  eventType: string | null;

  @Column({ type: 'text', nullable: true, name: 'subject' })
  subject: string | null;

  @Column({ type: 'text', nullable: true, name: 'body' })
  body: string | null;

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  errorMessage: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at', nullable: true })
  updatedAt: Date | null;
}
