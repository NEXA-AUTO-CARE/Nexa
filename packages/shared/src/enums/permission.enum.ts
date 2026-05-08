/**
 * Permission catalog for the Nexa platform. Naming convention: "<resource>:<action>".
 *
 * Permissions are code-defined (not user-creatable) because each one corresponds
 * to a guard in the API. Roles, by contrast, are stored in the database and can
 * be created/edited by a super_admin — those roles map to subsets of the catalog
 * below.
 */
export const Permission = {
  // Self-service (every authenticated user implicitly gets these for own data)
  USERS_READ_SELF: 'users:read.self',
  USERS_WRITE_SELF: 'users:write.self',

  // Admin user management
  USERS_READ_ALL: 'users:read.all',
  USERS_WRITE_ALL: 'users:write.all',

  // Role / permission administration
  ROLES_READ: 'roles:read',
  ROLES_MANAGE: 'roles:manage',
  ROLES_ASSIGN: 'roles:assign',

  // Vehicles
  VEHICLES_MANAGE_SELF: 'vehicles:manage.self',
  VEHICLES_READ_ALL: 'vehicles:read.all',

  // Bookings
  BOOKINGS_CREATE: 'bookings:create',
  BOOKINGS_READ_SELF: 'bookings:read.self',
  BOOKINGS_READ_ASSIGNED: 'bookings:read.assigned',
  BOOKINGS_READ_ALL: 'bookings:read.all',
  BOOKINGS_ASSIGN_VENDOR: 'bookings:assign-vendor',
  BOOKINGS_TRANSITION: 'bookings:transition',
  BOOKINGS_CANCEL: 'bookings:cancel',

  // Payments
  PAYMENTS_READ_SELF: 'payments:read.self',
  PAYMENTS_READ_ALL: 'payments:read.all',
  PAYMENTS_REFUND: 'payments:refund',
  PAYMENTS_PAYOUT: 'payments:payout',

  // Photos
  PHOTOS_UPLOAD: 'photos:upload',
  PHOTOS_READ: 'photos:read',

  // Reviews
  REVIEWS_CREATE: 'reviews:create',
  REVIEWS_READ: 'reviews:read',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

/** All permission codes as a flat array (used by seeders and the super_admin role). */
export const ALL_PERMISSIONS: Permission[] = Object.values(Permission);
