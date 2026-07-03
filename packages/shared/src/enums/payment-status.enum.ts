export const PaymentStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  CAPTURED: 'captured',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];
