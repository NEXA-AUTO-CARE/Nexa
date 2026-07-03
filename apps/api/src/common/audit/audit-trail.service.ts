import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditTrail } from '../../database/entities/audit-trail.entity';
import { ActorContext } from './actor.context';

@Injectable()
export class AuditTrailService {
  private readonly logger = new Logger(AuditTrailService.name);

  constructor(
    @InjectRepository(AuditTrail)
    private readonly repo: Repository<AuditTrail>,
    private readonly actor: ActorContext,
  ) {}

  /**
   * Record an audit trail entry for any admin action.
   *
   * @param entityType  Broad category, e.g. "BOOKING", "PAYMENT"
   * @param entityId    Primary key of the affected entity
   * @param action      Human-readable label, e.g. "UPDATE_STATUS", "ASSIGN_VENDOR"
   * @param oldValues   Snapshot of the old values before the change
   * @param newValues   Snapshot of the new values after the change
   * @param actorId     Override for the actor ID (defaults to the current request actor)
   */
  async record(
    entityType: string,
    entityId: string,
    action: string,
    oldValues?: Record<string, unknown> | null,
    newValues?: Record<string, unknown> | null,
    actorId?: string | null,
  ): Promise<void> {
    const resolvedActorId = actorId ?? this.actor.getActorId();
    if (!resolvedActorId) {
      this.logger.warn(
        `Skipping audit trail: no actor ID available for ${action} on ${entityType}:${entityId}`,
      );
      return;
    }

    const entry = this.repo.create({
      actorId: resolvedActorId,
      entityType,
      entityId,
      action,
      oldValues: oldValues ?? null,
      newValues: newValues ?? null,
    });

    await this.repo.save(entry);

    this.logger.log(
      `Audit trail: ${resolvedActorId} performed ${action} on ${entityType}:${entityId}`,
    );
  }
}
