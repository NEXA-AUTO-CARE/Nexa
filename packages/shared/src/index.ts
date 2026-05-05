export const APP_NAME = 'Nexa';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
