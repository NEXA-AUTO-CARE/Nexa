import type { BookingStatus } from '@nexa/shared';
import type { MessageTemplate, TemplateMap } from '../message-template.service';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface BookingNotificationContext {
  customerName: string;
  bookingId: string;
  bookingRef: string;
  transactionRef: string;
  vehicleSummary: string;
  serviceType: string;
  bookingTime: string;
  status: BookingStatus;
}

/**
 * @deprecated Use the shared `MessageTemplate` from message-template.service
 * instead. Kept temporarily for backwards compatibility.
 */
export type StatusTemplate = MessageTemplate;

/**
 * @deprecated Use the shared `TemplateMap` from message-template.service
 * instead. Kept temporarily for backwards compatibility.
 */
export type MessageTemplates = TemplateMap;

/** The settings key used to persist custom templates in system_settings */
export const NOTIFICATION_TEMPLATES_KEY = 'notification_templates';
