import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface WhatsAppSendResult {
  messageId?: string;
  success: boolean;
  error?: string;
}

export interface WhatsAppSendOptions {
  mediaUrl?: string[];
  contentSid?: string;
  contentVariables?: Record<string, string>;
}

@Injectable()
export class WhatsAppChannel {
  private readonly logger = new Logger(WhatsAppChannel.name);
  private client: {
    messages: {
      create: (opts: {
        to: string;
        from: string;
        body?: string;
        mediaUrl?: string[];
        contentSid?: string;
        contentVariables?: string;
      }) => Promise<{ sid?: string }>;
    };
  } | null = null;
  private from: string | undefined;

  constructor(private readonly config: ConfigService) {
    const sid = this.config.get<string>('app.twilio.sid');
    const token = this.config.get<string>('app.twilio.token');
    const rawFrom =
      this.config.get<string>('app.whatsapp.from') ||
      this.config.get<string>('app.twilio.from');

    if (rawFrom) {
      this.from = rawFrom.startsWith('whatsapp:')
        ? rawFrom
        : `whatsapp:${rawFrom}`;
    }

    if (sid && token && !sid.startsWith('AC_replace')) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Twilio = require('twilio');
        this.client = new Twilio(sid, token);
        this.logger.log(`WhatsApp channel configured via Twilio (From: ${this.from})`);
      } catch {
        this.logger.warn('Twilio SDK not installed — WhatsApp disabled');
      }
    } else {
      this.logger.warn('WhatsApp channel running in mock/dev mode');
    }
  }

  /**
   * Format any international E.164 phone number for WhatsApp
   * e.g. +447123456789 -> whatsapp:+447123456789
   */
  private formatWhatsAppNumber(phone: string): string {
    const cleaned = phone.trim().replace(/\s+/g, '');
    return cleaned.startsWith('whatsapp:') ? cleaned : `whatsapp:${cleaned}`;
  }

  /**
   * Send WhatsApp text or rich media message
   */
  async send(
    to: string,
    body: string,
    options?: WhatsAppSendOptions,
  ): Promise<WhatsAppSendResult> {
    const formattedTo = this.formatWhatsAppNumber(to);

    if (!this.client || !this.from) {
      const mockId = `mock-wa-${Date.now()}`;
      this.logger.log(
        `[WHATSAPP-DEV] To: ${formattedTo} | From: ${this.from || 'mock-sender'} | Body: ${body}${
          options?.mediaUrl ? ` | Media: ${options.mediaUrl.join(',')}` : ''
        }`,
      );
      return { messageId: mockId, success: true };
    }

    try {
      const payload: {
        to: string;
        from: string;
        body?: string;
        mediaUrl?: string[];
        contentSid?: string;
        contentVariables?: string;
      } = {
        to: formattedTo,
        from: this.from,
      };

      if (options?.contentSid) {
        payload.contentSid = options.contentSid;
        if (options.contentVariables) {
          payload.contentVariables = JSON.stringify(options.contentVariables);
        }
      } else {
        payload.body = body;
      }

      if (options?.mediaUrl && options.mediaUrl.length > 0) {
        payload.mediaUrl = options.mediaUrl;
      }

      const response = await this.client.messages.create(payload);
      this.logger.log(
        `WhatsApp message sent to ${formattedTo} (SID: ${response.sid})`,
      );
      return { messageId: response.sid, success: true };
    } catch (err) {
      const errorMsg = (err as Error).message;
      this.logger.error(
        `Failed to send WhatsApp message to ${formattedTo}: ${errorMsg}`,
        (err as Error).stack,
      );
      return { success: false, error: errorMsg };
    }
  }
}
