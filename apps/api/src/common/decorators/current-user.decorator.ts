import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { UserRole } from '@nexa/shared';

export interface AuthenticatedUser {
  userId: string;
  role: UserRole;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const req = ctx.switchToHttp().getRequest();
    return req.user;
  },
);
