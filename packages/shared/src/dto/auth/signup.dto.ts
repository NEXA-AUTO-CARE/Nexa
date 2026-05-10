import type { UserRole } from '../../enums/user-role.enum.js';

/**
 * Step 1 — Signup.
 * Caller supplies first name, last name, and at least one of email / phone.
 * `otpChannel` selects which contact receives the OTP and must match a non-null value.
 * `displayName` is optional; the server defaults it to `${firstName} ${lastName}` when omitted.
 */
export type OtpChannel = 'email' | 'phone';

export interface SignupDto {
  firstName: string;
  lastName: string;
  email: string | null;
  phoneNumber: string | null;
  role: UserRole;
  otpChannel: OtpChannel;
  displayName?: string;
}
