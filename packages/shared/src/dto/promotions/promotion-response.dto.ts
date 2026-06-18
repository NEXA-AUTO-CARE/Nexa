import type { PromotionStatus } from '../../enums/promotion-status.enum.js';
import type { PromotionType } from '../../enums/promotion-type.enum.js';

export interface PromotionResponse {
  promotionId: string;
  title: string;
  message: string;
  type: PromotionType;
  status: PromotionStatus;
  discountPercent: number | null;
  bonanzaThreshold: number | null;
  bonanzaRecurring: boolean;
  startDate: string | null;
  endDate: string | null;
  startedAt: string | null;
  endedAt: string | null;
  totalRedemptions: number;
  createdAt: string;
  assignedUserCount?: number;
}

