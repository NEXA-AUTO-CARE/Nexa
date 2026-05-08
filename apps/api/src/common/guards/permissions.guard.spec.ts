import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';

function execContextWith(user?: { permissions?: string[] }) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
}

function reflectorReturning(perms: string[] | undefined): Reflector {
  return {
    getAllAndOverride: jest.fn().mockReturnValue(perms),
  } as unknown as Reflector;
}

describe('PermissionsGuard', () => {
  it('allows the request when no permissions are required', () => {
    const guard = new PermissionsGuard(reflectorReturning(undefined));
    expect(guard.canActivate(execContextWith({ permissions: [] }))).toBe(true);
  });

  it('allows the request when the required permission list is empty', () => {
    const guard = new PermissionsGuard(reflectorReturning([]));
    expect(guard.canActivate(execContextWith({ permissions: [] }))).toBe(true);
  });

  it('denies when no user is attached to the request', () => {
    const guard = new PermissionsGuard(reflectorReturning(['users:read.all']));
    expect(() => guard.canActivate(execContextWith(undefined))).toThrow(
      ForbiddenException,
    );
  });

  it('denies when the user is missing one of the required permissions', () => {
    const guard = new PermissionsGuard(
      reflectorReturning(['users:read.all', 'roles:manage']),
    );
    expect(() =>
      guard.canActivate(execContextWith({ permissions: ['users:read.all'] })),
    ).toThrow(/Missing permission\(s\): roles:manage/);
  });

  it('allows when the user has every required permission', () => {
    const guard = new PermissionsGuard(reflectorReturning(['users:read.all']));
    expect(
      guard.canActivate(
        execContextWith({ permissions: ['users:read.all', 'something-else'] }),
      ),
    ).toBe(true);
  });
});
