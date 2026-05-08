import { ActorContext } from './actor.context';

describe('ActorContext', () => {
  let ctx: ActorContext;

  beforeEach(() => {
    ctx = new ActorContext();
  });

  it('returns a system actor (null userId) when no context has been entered', () => {
    expect(ctx.getActor()).toEqual({ userId: null });
    expect(ctx.getActorId()).toBeNull();
  });

  it('run() makes the actor visible inside the callback only', () => {
    const inside = ctx.run({ userId: 'u-1' }, () => ctx.getActorId());
    expect(inside).toBe('u-1');
    expect(ctx.getActorId()).toBeNull();
  });

  it('propagates the actor across awaited async boundaries inside run()', async () => {
    const result = await ctx.run({ userId: 'u-1' }, async () => {
      await new Promise((r) => setImmediate(r));
      return ctx.getActorId();
    });
    expect(result).toBe('u-1');
  });

  it('isolates concurrent run() invocations', async () => {
    const [a, b] = await Promise.all([
      ctx.run({ userId: 'u-A' }, async () => {
        await new Promise((r) => setTimeout(r, 5));
        return ctx.getActorId();
      }),
      ctx.run({ userId: 'u-B' }, async () => {
        await new Promise((r) => setTimeout(r, 1));
        return ctx.getActorId();
      }),
    ]);
    expect(a).toBe('u-A');
    expect(b).toBe('u-B');
  });

  it('enter() persists the actor for the rest of the current async chain', async () => {
    const captured = await new Promise<string | null>((resolve) => {
      // wrap in setImmediate so ALS is rooted in this callback's chain
      setImmediate(() => {
        ctx.enter({ userId: 'u-enter' });
        Promise.resolve()
          .then(() => Promise.resolve())
          .then(() => resolve(ctx.getActorId()));
      });
    });
    expect(captured).toBe('u-enter');
  });
});
