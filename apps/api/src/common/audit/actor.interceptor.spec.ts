import { firstValueFrom, of } from 'rxjs';
import { ActorContext } from './actor.context';
import { ActorInterceptor } from './actor.interceptor';

function execContextWith(req: { user?: { userId?: string } | undefined }) {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as any;
}

describe('ActorInterceptor', () => {
  let ctx: ActorContext;
  let interceptor: ActorInterceptor;

  beforeEach(() => {
    ctx = new ActorContext();
    interceptor = new ActorInterceptor(ctx);
  });

  it('pulls req.user.userId into ActorContext for the rest of the request chain', async () => {
    const next = { handle: () => of('payload') };
    const ec = execContextWith({ user: { userId: 'u-42' } });

    const result$ = interceptor.intercept(ec, next);
    const value = await firstValueFrom(result$);

    expect(value).toBe('payload');
    expect(ctx.getActorId()).toBe('u-42');
  });

  it('falls back to a null actor when req.user is absent', async () => {
    const next = { handle: () => of('ok') };
    const ec = execContextWith({});

    await firstValueFrom(interceptor.intercept(ec, next));
    expect(ctx.getActorId()).toBeNull();
  });
});
