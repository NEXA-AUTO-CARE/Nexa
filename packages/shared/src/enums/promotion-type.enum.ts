export enum PromotionType {
  /** Broadcast message only — no pricing impact */
  ANNOUNCEMENT = 'announcement',
  /** Flat percentage off the booking price */
  PERCENTAGE_DISCOUNT = 'percentage_discount',
  /** Free booking after every N paid bookings during the promo period */
  BONANZA = 'bonanza',
}
