import { Promotion } from '../../../database/entities';

export class PromotionStartedEvent {
  static readonly EVENT_NAME = 'promotion.started';

  constructor(public readonly promotion: Promotion) {}
}
