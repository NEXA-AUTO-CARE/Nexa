import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
} from 'typeorm';
import { AuditEntity } from '../../database/entities/audit.entity';
import { ActorContext } from './actor.context';

/**
 * Stamps the audit columns (createdBy / updatedBy) on every insert and update
 * of any entity that extends AuditEntity. Reads the current principal from
 * ActorContext (set by ActorInterceptor on each HTTP request).
 *
 * NOTE: This only fires for the entity-aware persistence APIs
 * (`repo.save(entity)`, `entityManager.save(entity)`). Bulk operations like
 * `repo.update(...)` and QueryBuilder `.update().execute()` do NOT trigger
 * subscribers — callers that need audit stamping for those must include
 * updatedBy in the patch explicitly, or switch to the save() pattern.
 */
@Injectable()
@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface {
  constructor(
    @InjectDataSource() dataSource: DataSource,
    private readonly actor: ActorContext,
  ) {
    dataSource.subscribers.push(this);
  }

  beforeInsert(event: InsertEvent<unknown>): void {
    const entity = event.entity;
    if (!(entity instanceof AuditEntity)) return;
    const actorId = this.actor.getActorId();
    if (!actorId) return;
    if (entity.createdBy == null) entity.createdBy = actorId;
    if (entity.updatedBy == null) entity.updatedBy = actorId;
  }

  beforeUpdate(event: UpdateEvent<unknown>): void {
    const entity = event.entity;
    if (!(entity instanceof AuditEntity)) return;
    const actorId = this.actor.getActorId();
    if (!actorId) return;
    entity.updatedBy = actorId;
  }
}
