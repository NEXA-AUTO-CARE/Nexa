import type { MessageTemplate, TemplateMap } from '../notifications/message-template.service';

/* ------------------------------------------------------------------ */
/*  Template context                                                   */
/* ------------------------------------------------------------------ */

export interface PromotionNotificationContext {
  promotionTitle: string;
  promotionMessage: string;
  customerName: string;
  discountPercent?: string;
  bonanzaThreshold?: string;
}

/* ------------------------------------------------------------------ */
/*  Default templates per promotion type                               */
/* ------------------------------------------------------------------ */

export const DEFAULT_PROMOTION_TEMPLATES: TemplateMap = {
  announcement: {
    title: '{{promotionTitle}}',
    emailBody: '{{promotionMessage}}',
    smsBody: 'NEXA: {{promotionTitle}} — {{promotionMessage}}',
  },
  percentage_discount: {
    title: '{{promotionTitle}} — {{discountPercent}}% Off!',
    emailBody:
      '{{promotionMessage}}\n\nGet <strong>{{discountPercent}}% off</strong> your next wash — book now while the offer lasts!',
    smsBody:
      'NEXA: {{promotionTitle}} — Get {{discountPercent}}% off your next wash! {{promotionMessage}}',
  },
  bonanza: {
    title: '{{promotionTitle}} — Bonanza Deal!',
    emailBody:
      '{{promotionMessage}}\n\nBook <strong>{{bonanzaThreshold}} washes</strong> and get the next one <strong>FREE</strong>!',
    smsBody:
      'NEXA: {{promotionTitle}} — Book {{bonanzaThreshold}} washes, get the next one FREE! {{promotionMessage}}',
  },
};

/** Settings key for custom template overrides in system_settings. */
export const PROMOTION_TEMPLATES_KEY = 'promotion_notification_templates';

/** Fallback when the type key is missing from both defaults and overrides. */
export const PROMOTION_GENERIC_FALLBACK: MessageTemplate = {
  title: 'Promotion Update',
  emailBody: 'You have a new promotion from NEXA. Check the app for details!',
  smsBody: 'NEXA: You have a new promotion! Check the app for details.',
};
