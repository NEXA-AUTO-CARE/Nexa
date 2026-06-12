import type { PublicUser } from '../../types/public-user.js';

export interface AuthResponse {
  accessToken: string;
  user: PublicUser;
  requiresPasswordChange?: boolean;
}
