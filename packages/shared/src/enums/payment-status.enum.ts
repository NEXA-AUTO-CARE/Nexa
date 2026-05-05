export const PaymentStatus = {
  PENDING: 'pending',
  CAPTURED: 'captured',
  REFUNDED: 'refunded',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];
