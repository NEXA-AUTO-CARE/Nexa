import type { UserRole } from '../../enums/user-role.enum.js';

/**
 * Step 1: User submits an email-or-phone identifier and chooses a role.
 * Server creates a pending user (otpVerified=false) and dispatches an OTP.
 */
export interface SignupDto {
  identifier: string;
  role: UserRole;
  displayName: string;
}
