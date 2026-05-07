import type { UserRole } from '../enums/user-role.enum.js';

export interface PublicUser {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phoneNumber: string | null;
  role: UserRole;
  displayName: string;
  otpVerified: boolean;
  createdAt: string;
}
