import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

function execContextWith(user?: { role?: string }) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
}

function reflectorReturning(roles: string[] | undefined): Reflector {
  return {
    getAllAndOverride: jest.fn().mockReturnValue(roles),
  } as unknown as Reflector;
}

describe('RolesGuard', () => {
  it('passes when no roles are required on the route', () => {
    const guard = new RolesGuard(reflectorReturning(undefined));
    expect(guard.canActivate(execContextWith({ role: 'customer' }))).toBe(true);
  });

  it('rejects when no user is attached to the request', () => {
    const guard = new RolesGuard(reflectorReturning(['admin']));
    expect(() => guard.canActivate(execContextWith(undefined))).toThrow(
      ForbiddenException,
    );
  });

  it('rejects when the user role is not in the allowed list', () => {
    const guard = new RolesGuard(reflectorReturning(['admin', 'super_admin']));
    expect(() =>
      guard.canActivate(execContextWith({ role: 'customer' })),
    ).toThrow(/Requires role/);
  });

  it('passes when the user role is one of the allowed roles', () => {
    const guard = new RolesGuard(reflectorReturning(['admin', 'super_admin']));
    expect(guard.canActivate(execContextWith({ role: 'admin' }))).toBe(true);
  });

  it('supports custom (non-system) role names too', () => {
    const guard = new RolesGuard(reflectorReturning(['support_agent']));
    expect(guard.canActivate(execContextWith({ role: 'support_agent' }))).toBe(
      true,
    );
  });
});
