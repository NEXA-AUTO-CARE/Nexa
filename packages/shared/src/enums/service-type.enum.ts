export const ServiceType = {
  BASIC: 'basic',
  FULL: 'full',
  PREMIUM: 'premium',
} as const;
export type ServiceType = (typeof ServiceType)[keyof typeof ServiceType];
