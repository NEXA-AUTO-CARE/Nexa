import type { BookingStatus } from '@nexa/shared';

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

export interface StatusTemplate {
  title: string;
  /** Email body — supports {{placeholder}} interpolation */
  emailBody: string;
  /** SMS body — supports {{placeholder}} interpolation */
  smsBody: string;
}

export type MessageTemplates = Record<string, StatusTemplate>;

/* ------------------------------------------------------------------ */
/*  Default templates (used as fallback when DB has no value)          */
/* ------------------------------------------------------------------ */

export const DEFAULT_TEMPLATES: MessageTemplates = {
  booked: {
    title: 'Booking Confirmed',
    emailBody:
      'Your booking for {{vehicleSummary}} on {{bookingTime}} has been confirmed. We\'ll notify you when a detailer accepts.',
    smsBody:
      'NEXA: Your booking for {{vehicleSummary}} on {{bookingTime}} has been confirmed. We\'ll notify you when a detailer accepts.',
  },
  accepted: {
    title: 'Booking Accepted',
    emailBody:
      'Great news! A detailer has accepted your booking for {{vehicleSummary}}. They\'ll arrive on {{bookingTime}}.',
    smsBody:
      'NEXA: Great news! A detailer has accepted your booking for {{vehicleSummary}}. They\'ll arrive on {{bookingTime}}.',
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
      'Your {{vehicleSummary}} is looking fresh! Your wash is complete. We\'d love to hear your feedback.',
    smsBody:
      'NEXA: Your {{vehicleSummary}} is looking fresh! Your wash is complete. We\'d love to hear your feedback.',
  },
  cancelled: {
    title: 'Booking Cancelled',
    emailBody:
      'Your booking for {{vehicleSummary}} on {{bookingTime}} has been cancelled.',
    smsBody:
      'NEXA: Your booking for {{vehicleSummary}} on {{bookingTime}} has been cancelled.',
  },
};

/** The settings key used to persist custom templates in system_settings */
export const NOTIFICATION_TEMPLATES_KEY = 'notification_templates';

/* ------------------------------------------------------------------ */
/*  Interpolation helper                                               */
/* ------------------------------------------------------------------ */

/**
 * Replace `{{key}}` placeholders in a template string with matching
 * values from the notification context.
 */
function interpolate(template: string, ctx: BookingNotificationContext): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const val = (ctx as unknown as Record<string, string>)[key];
    return val !== undefined ? val : `{{${key}}}`;
  });
}

/* ------------------------------------------------------------------ */
/*  Public builders                                                    */
/* ------------------------------------------------------------------ */

/**
 * Merge DB-loaded templates over hardcoded defaults for a given status.
 */
function resolveTemplate(
  status: string,
  overrides?: MessageTemplates | null,
): StatusTemplate {
  const defaults = DEFAULT_TEMPLATES[status] ?? {
    title: 'Booking Update',
    emailBody: 'Your booking status has been updated.',
    smsBody: 'NEXA: Your booking status has been updated.',
  };

  if (!overrides?.[status]) return defaults;

  return {
    title: overrides[status].title || defaults.title,
    emailBody: overrides[status].emailBody || defaults.emailBody,
    smsBody: overrides[status].smsBody || defaults.smsBody,
  };
}

/**
 * Build the email subject + HTML body for a booking notification.
 *
 * @param ctx       - Booking notification context values
 * @param templates - Optional DB-loaded template overrides
 */
export function getBookingEmailHtml(
  ctx: BookingNotificationContext,
  templates?: MessageTemplates | null,
): { subject: string; html: string } {
  const tpl = resolveTemplate(ctx.status, templates);
  const title = interpolate(tpl.title, ctx);
  const message = interpolate(tpl.emailBody, ctx);

  return {
    subject: `NEXA — ${title}`,
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #0f1923; color: #e2e8f0; padding: 32px; border-radius: 12px;">
        <h1 style="color: #5BE9B0; font-size: 24px; margin: 0 0 8px;">${title}</h1>
        <p style="color: #94A3B8; margin: 0 0 20px;">Hi ${ctx.customerName},</p>
        <p style="line-height: 1.6;">${message}</p>
        <div style="margin-top: 24px; padding: 16px; background: #1a2332; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);">
          <p style="margin: 4px 0; color: #94A3B8;"><strong style="color: #fff;">Vehicle:</strong> ${ctx.vehicleSummary}</p>
          <p style="margin: 4px 0; color: #94A3B8;"><strong style="color: #fff;">Service:</strong> ${ctx.serviceType}</p>
          <p style="margin: 4px 0; color: #94A3B8;"><strong style="color: #fff;">Date:</strong> ${ctx.bookingTime}</p>
        </div>
        <p style="margin-top: 24px; font-size: 12px; color: #64748B;">© ${new Date().getFullYear()} NEXA. Aberdeen, Scotland.</p>
      </div>
    `,
  };
}

/**
 * Build the SMS body for a booking notification.
 *
 * @param ctx       - Booking notification context values
 * @param templates - Optional DB-loaded template overrides
 */
export function getBookingSmsText(
  ctx: BookingNotificationContext,
  templates?: MessageTemplates | null,
): string {
  const tpl = resolveTemplate(ctx.status, templates);
  return interpolate(tpl.smsBody, ctx);
}
