import { AuditEntity } from '../../database/entities/audit.entity';
import { ActorContext } from './actor.context';
import { AuditSubscriber } from './audit.subscriber';

class FakeAudited extends AuditEntity {
  public id!: string;
}

class NotAudited {
  public id!: string;
}

describe('AuditSubscriber', () => {
  let actor: ActorContext;
  let dataSource: { subscribers: unknown[] };
  let subscriber: AuditSubscriber;

  beforeEach(() => {
    actor = new ActorContext();
    dataSource = { subscribers: [] };
    subscriber = new AuditSubscriber(dataSource as never, actor);
  });

  it('registers itself in the data source on construction', () => {
    expect(dataSource.subscribers).toContain(subscriber);
  });

  describe('beforeInsert', () => {
    it('stamps createdBy and updatedBy when an actor is present', () => {
      const entity = new FakeAudited();
      entity.createdBy = null;
      entity.updatedBy = null;
      actor.run({ userId: 'u-1' }, () => {
        subscriber.beforeInsert({ entity } as never);
      });
      expect(entity.createdBy).toBe('u-1');
      expect(entity.updatedBy).toBe('u-1');
    });

    it('does nothing when there is no actor (system writes preserve null)', () => {
      const entity = new FakeAudited();
      entity.createdBy = null;
      entity.updatedBy = null;
      subscriber.beforeInsert({ entity } as never);
      expect(entity.createdBy).toBeNull();
      expect(entity.updatedBy).toBeNull();
    });

    it('does not override values explicitly set by the caller', () => {
      const entity = new FakeAudited();
      entity.createdBy = 'caller-set';
      entity.updatedBy = null;
      actor.run({ userId: 'u-1' }, () => {
        subscriber.beforeInsert({ entity } as never);
      });
      expect(entity.createdBy).toBe('caller-set');
      expect(entity.updatedBy).toBe('u-1');
    });

    it('skips entities that do not extend AuditEntity', () => {
      const entity = new NotAudited() as any;
      actor.run({ userId: 'u-1' }, () => {
        subscriber.beforeInsert({ entity } as never);
      });
      expect(entity.createdBy).toBeUndefined();
      expect(entity.updatedBy).toBeUndefined();
    });
  });

  describe('beforeUpdate', () => {
    it('overwrites updatedBy with the current actor', () => {
      const entity = new FakeAudited();
      entity.updatedBy = 'previous';
      actor.run({ userId: 'u-2' }, () => {
        subscriber.beforeUpdate({ entity } as never);
      });
      expect(entity.updatedBy).toBe('u-2');
    });

    it('leaves updatedBy untouched when there is no actor', () => {
      const entity = new FakeAudited();
      entity.updatedBy = 'previous';
      subscriber.beforeUpdate({ entity } as never);
      expect(entity.updatedBy).toBe('previous');
    });

    it('skips non-AuditEntity instances', () => {
      const entity = new NotAudited() as any;
      entity.updatedBy = 'pre';
      actor.run({ userId: 'u-2' }, () => {
        subscriber.beforeUpdate({ entity } as never);
      });
      expect(entity.updatedBy).toBe('pre');
    });

    it('handles undefined event.entity (bulk updates) gracefully', () => {
      expect(() => {
        actor.run({ userId: 'u-2' }, () => {
          subscriber.beforeUpdate({ entity: undefined } as never);
        });
      }).not.toThrow();
    });
  });
});
