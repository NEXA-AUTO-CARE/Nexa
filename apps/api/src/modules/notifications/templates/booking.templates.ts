import type { BookingStatus } from '@nexa/shared';
import type { MessageTemplate, TemplateMap } from '../message-template.service';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface BookingNotificationContext {
  customerName: string;
  bookingId: string;
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

/* ------------------------------------------------------------------ */
/*  Default templates (used as fallback when DB has no value)          */
/* ------------------------------------------------------------------ */

export const DEFAULT_BOOKING_TEMPLATES: TemplateMap = {
  booked: {
    title: 'Booking Confirmed',
    emailBody:
      "Your booking for {{vehicleSummary}} on {{bookingTime}} has been confirmed. We'll notify you when a detailer accepts.",
    smsBody:
      "NEXA: Your booking for {{vehicleSummary}} on {{bookingTime}} has been confirmed. We'll notify you when a detailer accepts.",
  },
  accepted: {
    title: 'Booking Accepted',
    emailBody:
      "Great news! A detailer has accepted your booking for {{vehicleSummary}}. They'll arrive on {{bookingTime}}.",
    smsBody:
      "NEXA: Great news! A detailer has accepted your booking for {{vehicleSummary}}. They'll arrive on {{bookingTime}}.",
  },
  in_progress: {
    title: 'Detailing In Progress',
    emailBody:
      'Your detailer is now working on {{vehicleSummary}}. Sit back and relax!',
    smsBody:
      'NEXA: Your detailer is now working on {{vehicleSummary}}. Sit back and relax!',
  },
  completed: {
    title: 'Wash Complete',
    emailBody:
      "Your {{vehicleSummary}} is looking fresh! Your wash is complete. We'd love to hear your feedback.",
    smsBody:
      "NEXA: Your {{vehicleSummary}} is looking fresh! Your wash is complete. We'd love to hear your feedback.",
  },
  cancelled: {
    title: 'Booking Cancelled',
    emailBody:
      'Your booking for {{vehicleSummary}} on {{bookingTime}} has been cancelled.',
    smsBody:
      'NEXA: Your booking for {{vehicleSummary}} on {{bookingTime}} has been cancelled.',
  },
};

/** Legacy alias – existing code may reference this name. */
export const DEFAULT_TEMPLATES = DEFAULT_BOOKING_TEMPLATES;

/** The settings key used to persist custom templates in system_settings */
export const NOTIFICATION_TEMPLATES_KEY = 'notification_templates';

/** Generic fallback when the booking status is not in the defaults map. */
export const BOOKING_GENERIC_FALLBACK: MessageTemplate = {
  title: 'Booking Update',
  emailBody: 'Your booking status has been updated.',
  smsBody: 'NEXA: Your booking status has been updated.',
};
