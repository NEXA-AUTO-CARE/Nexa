import type { PromotionType } from '../../enums/promotion-type.enum.js';

export interface UpdatePromotionDto {
  title?: string;
  message?: string;
  type?: PromotionType;
  discountPercent?: number;
  bonanzaThreshold?: number;
  bonanzaRecurring?: boolean;
  startDate?: string | null;
  endDate?: string | null;
}
