import { SetMetadata } from '@nestjs/common';
import type { Permission } from '@nexa/shared';

export const PERMISSIONS_KEY = 'requiredPermissions';

/**
 * Require the authenticated user to hold ALL of the given permission codes.
 * Use alongside (or instead of) @Roles for fine-grained gating.
 *
 * Example:
 *   @RequirePermissions(Permission.ROLES_MANAGE)
 *   @Post('roles')
 *   create(...) { ... }
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
