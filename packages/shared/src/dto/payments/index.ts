import type { PaymentStatus } from '../../enums/payment-status.enum.js';

export interface CreatePaymentIntentDto {
  bookingId: string;
}

export interface PaymentResponse {
  paymentId: string;
  bookingId: string;
  status: PaymentStatus;
  amount: string;
  clientSecret?: string; // Provided to frontend for completing payment
}
