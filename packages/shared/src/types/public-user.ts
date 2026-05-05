import type { UserRole } from '../enums/user-role.enum.js';

export interface PublicUser {
  userId: string;
  email: string | null;
  phoneNumber: string | null;
  role: UserRole;
  displayName: string;
  otpVerified: boolean;
  createdAt: string;
}
