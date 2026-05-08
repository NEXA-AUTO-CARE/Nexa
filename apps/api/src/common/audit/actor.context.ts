import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface Actor {
  /** userId of the authenticated principal, or null for unauthenticated/system flows. */
  userId: string | null;
}

const SYSTEM_ACTOR: Actor = { userId: null };

@Injectable()
export class ActorContext {
  private readonly als = new AsyncLocalStorage<Actor>();

  /** Run `fn` with the given actor as the active principal for that async chain. */
  run<T>(actor: Actor, fn: () => T): T {
    return this.als.run(actor, fn);
  }

  /** Enter the actor context for the rest of the current async chain (no callback). */
  enter(actor: Actor): void {
    this.als.enterWith(actor);
  }

  /** Read the current actor; falls back to a null/system actor if none is set. */
  getActor(): Actor {
    return this.als.getStore() ?? SYSTEM_ACTOR;
  }

  getActorId(): string | null {
    return this.getActor().userId;
  }
}
