/**
 * Step 3: Client exchanges setupToken + chosen password for the first
 * access/refresh pair. After this call the user is fully active.
 */
export interface SetPasswordDto {
  setupToken: string;
  password: string;
}
