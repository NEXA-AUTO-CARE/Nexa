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
      ? `<p style="color: #94A3B8; margin: 0 0 20px;">Hi ${ctx['customerName']},</p>`
      : '';

    return {
      subject: `NEXA — ${title}`,
      html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #0f1923; color: #e2e8f0; padding: 32px; border-radius: 12px;">
        <h1 style="color: #5BE9B0; font-size: 24px; margin: 0 0 8px;">${title}</h1>
        ${greeting}
        <p style="line-height: 1.6;">${message}</p>
        ${extraHtml ?? ''}
        <p style="margin-top: 24px; font-size: 12px; color: #64748B;">© ${new Date().getFullYear()} NEXA. Aberdeen, Scotland.</p>
      </div>
      `,
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
