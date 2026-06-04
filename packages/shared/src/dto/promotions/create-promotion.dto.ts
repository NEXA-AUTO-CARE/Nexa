import type { PromotionType } from '../../enums/promotion-type.enum.js';

export interface CreatePromotionDto {
  title: string;
  message: string;
  type: PromotionType;
  /** Required when type = 'percentage_discount'. Value between 1–100. */
  discountPercent?: number;
  /** Required when type = 'bonanza'. Number of paid bookings before a free one. */
  bonanzaThreshold?: number;
  /** When true the bonanza cycles (pay, pay, FREE, pay, pay, FREE, …). Default false = one-off. */
  bonanzaRecurring?: boolean;
  /** Optional scheduled start date (ISO 8601). */
  startDate?: string;
  /** Optional scheduled end date (ISO 8601). */
  endDate?: string;
}
