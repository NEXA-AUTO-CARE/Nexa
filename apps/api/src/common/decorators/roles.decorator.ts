import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@nexa/shared';

export const ROLES_KEY = 'roles';

/**
 * Restrict a route to one of the named roles. Accepts the four system role
 * names (UserRole enum values) or any custom role name created by a super_admin.
 *
 * For finer-grained gating, prefer @RequirePermissions over role names.
 */
export const Roles = (...roles: Array<UserRole | string>) =>
  SetMetadata(ROLES_KEY, roles);
