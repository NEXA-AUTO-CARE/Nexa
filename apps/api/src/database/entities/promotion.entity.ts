import { PromotionStatus, PromotionType } from '@nexa/shared';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { AuditEntity } from './audit.entity';
import { PromotionRedemption } from './promotion-redemption.entity';
import { User } from './user.entity';

@Entity('promotions')
export class Promotion extends AuditEntity {
  @PrimaryColumn({
    type: 'uuid',
    name: 'promotion_id',
    default: () => 'uuidv7()',
  })
  promotionId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({
    type: 'enum',
    enum: PromotionType,
    default: PromotionType.ANNOUNCEMENT,
  })
  type: PromotionType;

  @Column({
    type: 'enum',
    enum: PromotionStatus,
    default: PromotionStatus.DRAFT,
  })
  status: PromotionStatus;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  discountPercent: string | null;

  @Column({ type: 'int', nullable: true })
  bonanzaThreshold: number | null;

  @Column({ type: 'boolean', default: false })
  bonanzaRecurring: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  startDate: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  endDate: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  endedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  startedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'started_by_id' })
  startedBy: User | null;

  @Column({ type: 'uuid', nullable: true })
  endedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'ended_by_id' })
  endedBy: User | null;

  @OneToMany(() => PromotionRedemption, (r) => r.promotion)
  redemptions: PromotionRedemption[];
}
