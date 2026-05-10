import type { BookingStatus } from '@nexa/shared';

export interface BookingNotificationContext {
  customerName: string;
  bookingId: string;
  vehicleSummary: string;
  serviceType: string;
  bookingTime: string;
  status: BookingStatus;
}

const STATUS_TITLES: Record<string, string> = {
  booked: 'Booking Confirmed',
  accepted: 'Booking Accepted',
  in_progress: 'Detailing In Progress',
  completed: 'Wash Complete',
  cancelled: 'Booking Cancelled',
};

const STATUS_MESSAGES: Record<string, (ctx: BookingNotificationContext) => string> = {
  booked: (ctx) =>
    `Your booking for ${ctx.vehicleSummary} on ${ctx.bookingTime} has been confirmed. We'll notify you when a detailer accepts.`,
  accepted: (ctx) =>
    `Great news! A detailer has accepted your booking for ${ctx.vehicleSummary}. They'll arrive on ${ctx.bookingTime}.`,
  in_progress: (ctx) =>
    `Your detailer is now working on ${ctx.vehicleSummary}. Sit back and relax!`,
  completed: (ctx) =>
    `Your ${ctx.vehicleSummary} is looking fresh! Your wash is complete. We'd love to hear your feedback.`,
  cancelled: (ctx) =>
    `Your booking for ${ctx.vehicleSummary} on ${ctx.bookingTime} has been cancelled.`,
};

export function getBookingEmailHtml(ctx: BookingNotificationContext): { subject: string; html: string } {
  const title = STATUS_TITLES[ctx.status] ?? 'Booking Update';
  const message = STATUS_MESSAGES[ctx.status]?.(ctx) ?? 'Your booking status has been updated.';

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

export function getBookingSmsText(ctx: BookingNotificationContext): string {
  const message = STATUS_MESSAGES[ctx.status]?.(ctx) ?? 'Your booking status has been updated.';
  return `NEXA: ${message}`;
}
