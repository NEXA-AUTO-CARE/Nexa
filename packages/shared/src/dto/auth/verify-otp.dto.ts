/**
 * Step 2 — Verify OTP.
 * `identifier` is the email or phone the OTP was sent to in step 1.
 * Returns a short-lived setup token used by /auth/set-password.
 */
export interface VerifyOtpDto {
  identifier: string;
  code: string;
}

export interface VerifyOtpResponse {
  setupToken: string;
}
