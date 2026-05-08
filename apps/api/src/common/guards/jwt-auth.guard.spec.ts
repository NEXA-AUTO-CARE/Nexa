import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

function makeContext(): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({}) }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  it('returns true (bypasses passport) when @Public() is set', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(true),
    } as unknown as Reflector;
    const guard = new JwtAuthGuard(reflector);
    expect(guard.canActivate(makeContext())).toBe(true);
  });

  it('delegates to the passport AuthGuard when not @Public()', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;
    const guard = new JwtAuthGuard(reflector);
    const baseSpy = jest
      .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate')
      .mockReturnValue('delegated' as never);

    const result = guard.canActivate(makeContext());

    expect(baseSpy).toHaveBeenCalled();
    expect(result).toBe('delegated');
    baseSpy.mockRestore();
  });
});
