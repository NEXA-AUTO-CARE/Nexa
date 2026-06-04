import { Injectable, Logger } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';

/* ------------------------------------------------------------------ */
/*  Shared types                                                       */
/* ------------------------------------------------------------------ */

/**
 * A single message template with title, email body, and SMS body.
 * All fields support `{{placeholder}}` interpolation.
 */
export interface MessageTemplate {
  title: string;
  emailBody: string;
  smsBody: string;
}

/** A map of event/status keys → their templates. */
export type TemplateMap = Record<string, MessageTemplate>;

/** The result of processing a template for email delivery. */
export interface ProcessedEmail {
  subject: string;
  html: string;
}

/* ------------------------------------------------------------------ */
/*  Service                                                            */
/* ------------------------------------------------------------------ */

/**
 * Centralised utility for resolving, interpolating, and rendering
 * notification templates. Both booking and auth flows delegate here
 * so there is a single place for template processing logic.
 */
@Injectable()
export class MessageTemplateService {
  private readonly logger = new Logger(MessageTemplateService.name);

  constructor(private readonly settings: SettingsService) {}

  /* ---------------------------------------------------------------- */
  /*  Template loading from the database                               */
  /* ---------------------------------------------------------------- */

  /**
   * Load custom template overrides from `system_settings` by key.
   * Returns `null` when no custom templates exist (callers fall back
   * to their hardcoded defaults).
   */
  async loadOverrides(settingsKey: string): Promise<TemplateMap | null> {
    try {
      const setting = await this.settings.findOne(settingsKey);
      if (!setting?.value) return null;
      return JSON.parse(setting.value) as TemplateMap;
    } catch (err) {
      this.logger.warn(
        `Failed to parse "${settingsKey}" setting — using defaults`,
        (err as Error).message,
      );
      return null;
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Template resolution (DB override → hardcoded default)            */
  /* ---------------------------------------------------------------- */

  /**
   * Merge DB-loaded overrides over hardcoded defaults for a given
   * event/status key. If no override exists the default is returned
   * as-is. If the key is missing from both, a generic fallback is used.
   */
  resolveTemplate(
    key: string,
    defaults: TemplateMap,
    overrides?: TemplateMap | null,
    genericFallback?: MessageTemplate,
  ): MessageTemplate {
    const fallback = genericFallback ?? {
      title: 'Notification',
      emailBody: 'You have a new notification.',
      smsBody: 'NEXA: You have a new notification.',
    };

    const base = defaults[key] ?? fallback;

    if (!overrides?.[key]) return base;

    return {
      title: overrides[key].title || base.title,
      emailBody: overrides[key].emailBody || base.emailBody,
      smsBody: overrides[key].smsBody || base.smsBody,
    };
  }

  /* ---------------------------------------------------------------- */
  /*  Interpolation                                                    */
  /* ---------------------------------------------------------------- */

  /**
   * Replace `{{key}}` placeholders in a template string with matching
   * values from a flat context object. Un-matched placeholders are
   * left in place so they surface visibly in logs / emails.
   */
  interpolate(template: string, ctx: Record<string, string | undefined>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
      const val = ctx[key];
      return val !== undefined ? val : `{{${key}}}`;
    });
  }

  /* ---------------------------------------------------------------- */
  /*  Builders                                                         */
  /* ---------------------------------------------------------------- */

  /**
   * Build an email subject + branded HTML body from a resolved template.
   *
   * @param tpl          - The resolved template (after merging overrides)
   * @param ctx          - Flat context for `{{placeholder}}` interpolation
   * @param extraHtml    - Optional extra HTML block inserted after the
   *                       main message (e.g. booking detail cards)
   */
  buildEmail(
    tpl: MessageTemplate,
    ctx: Record<string, string | undefined>,
    extraHtml?: string,
  ): ProcessedEmail {
    const title = this.interpolate(tpl.title, ctx);
    const message = this.interpolate(tpl.emailBody, ctx);

    const greeting = ctx['customerName']
<<<<<<< HEAD
      ? `<p style="color: #94A3B8; margin: 0 0 20px; font-size: 16px;">Hi ${ctx['customerName']},</p>`
=======
      ? `<p style="color: #94A3B8; margin: 0 0 20px;">Hi ${ctx['customerName']},</p>`
>>>>>>> origin/dev
      : '';

    return {
      subject: `NEXA — ${title}`,
<<<<<<< HEAD
      html: `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <meta name="x-apple-disable-message-reformatting"/>
  <meta name="color-scheme" content="dark"/>
  <meta name="supported-color-schemes" content="dark"/>
  <title>${title}</title>
  <!--[if mso]>
  <noscript><xml>
    <o:OfficeDocumentSettings>
      <o:AllowPNG/>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml></noscript>
  <![endif]-->
  <style>
    /* Reset */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
    /* Dark mode */
    :root { color-scheme: dark; supported-color-schemes: dark; }
    @media (prefers-color-scheme: dark) {
      body, .email-body { background-color: #0a0f14 !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; width: 100%; height: 100%; background-color: #0a0f14; -webkit-font-smoothing: antialiased;">
  <!-- Full-width wrapper table -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #0a0f14;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <!-- Constrained content table (600px industry standard) -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; background-color: #0f1923; border-radius: 12px; overflow: hidden;">
          <!-- Header accent bar -->
          <tr>
            <td style="height: 4px; background: linear-gradient(90deg, #5BE9B0, #3BC4F2); font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>
          <!-- Logo / Brand -->
          <tr>
            <td style="padding: 32px 32px 0 32px;">
              <p style="margin: 0; font-family: 'Inter', Arial, Helvetica, sans-serif; font-size: 14px; font-weight: 700; letter-spacing: 2px; color: #5BE9B0;">NEXA</p>
            </td>
          </tr>
          <!-- Main content -->
          <tr>
            <td style="padding: 24px 32px 32px 32px; font-family: 'Inter', Arial, Helvetica, sans-serif; color: #e2e8f0;">
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; line-height: 1.3; color: #ffffff;">${title}</h1>
              ${greeting}
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.7; color: #cbd5e1;">${message}</p>
              ${extraHtml ?? ''}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid rgba(255,255,255,0.06);">
              <p style="margin: 0; font-family: 'Inter', Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.5; color: #64748B;">© ${new Date().getFullYear()} NEXA Auto Care Ltd. Aberdeen, Scotland.</p>
              <p style="margin: 8px 0 0 0; font-family: 'Inter', Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.5; color: #475569;">This is an automated message. Please do not reply directly to this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
=======
      html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #0f1923; color: #e2e8f0; padding: 32px; border-radius: 12px;">
        <h1 style="color: #5BE9B0; font-size: 24px; margin: 0 0 8px;">${title}</h1>
        ${greeting}
        <p style="line-height: 1.6;">${message}</p>
        ${extraHtml ?? ''}
        <p style="margin-top: 24px; font-size: 12px; color: #64748B;">© ${new Date().getFullYear()} NEXA. Aberdeen, Scotland.</p>
      </div>
      `,
>>>>>>> origin/dev
    };
  }

  /**
   * Build the SMS body from a resolved template.
   */
  buildSms(tpl: MessageTemplate, ctx: Record<string, string | undefined>): string {
    return this.interpolate(tpl.smsBody, ctx);
  }

  /* ---------------------------------------------------------------- */
  /*  Convenience: load + resolve + build in one call                  */
  /* ---------------------------------------------------------------- */

  /**
   * Full pipeline: load overrides from DB → resolve template →
   * build both email and SMS output in a single call.
   */
  async process(
    key: string,
    defaults: TemplateMap,
    settingsKey: string,
    ctx: Record<string, string | undefined>,
    extraEmailHtml?: string,
  ): Promise<{ subject: string; html: string; smsText: string }> {
    const overrides = await this.loadOverrides(settingsKey);
    const tpl = this.resolveTemplate(key, defaults, overrides);
    const { subject, html } = this.buildEmail(tpl, ctx, extraEmailHtml);
    const smsText = this.buildSms(tpl, ctx);
    return { subject, html, smsText };
  }
}
