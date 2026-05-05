/**
 * Step 2: Client submits OTP for the same identifier from signup.
 * Server returns a short-lived setupToken used by /auth/set-password.
 */
export interface VerifyOtpDto {
  identifier: string;
  code: string;
}

export interface VerifyOtpResponse {
  setupToken: string;
}
