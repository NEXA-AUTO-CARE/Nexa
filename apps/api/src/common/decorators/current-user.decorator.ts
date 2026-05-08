import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { Permission } from '@nexa/shared';

export interface AuthenticatedUser {
  userId: string;
  /** Role name (system role like 'customer' or a super-admin-created custom role). */
  role: string;
  /** Effective permission codes resolved from the user's role at JWT issuance. */
  permissions: Permission[];
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const req = ctx.switchToHttp().getRequest();
    return req.user;
  },
);
