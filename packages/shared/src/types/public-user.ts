import type { Permission } from '../enums/permission.enum.js';

/**
 * Shape of a user returned by the API to the client. Includes the assigned role's
 * machine name (which may be one of the four system roles or a custom super-admin
 * created role) and the effective permission codes that apply to that role.
 */
export interface PublicUser {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phoneNumber: string | null;
  role: string;
  permissions: Permission[];
  displayName: string;
  otpVerified: boolean;
  createdAt: string;
  stripeAccountId: string | null;
  isActive: boolean;
}

