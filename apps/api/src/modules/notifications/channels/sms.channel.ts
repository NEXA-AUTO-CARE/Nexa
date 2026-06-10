import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsChannel {
  private readonly logger = new Logger(SmsChannel.name);
  private client: {
    messages: {
      create: (opts: {
        to: string;
        from: string;
        body: string;
      }) => Promise<unknown>;
    };
  } | null = null;
  private from: string | undefined;

  constructor(private readonly config: ConfigService) {
    const sid = this.config.get<string>('app.twilio.sid');
    const token = this.config.get<string>('app.twilio.token');
    this.from = this.config.get<string>('app.twilio.from');

    if (sid && token && !sid.startsWith('AC_replace')) {
      // Dynamically require twilio — avoids compile-time dependency
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Twilio = require('twilio');
        this.client = new Twilio(sid, token);
        this.logger.log('SMS channel configured via Twilio');
      } catch {
        this.logger.warn('Twilio SDK not installed — SMS disabled');
      }
    } else {
      this.logger.warn('SMS channel disabled — Twilio not configured');
    }
  }

  async send(to: string, body: string): Promise<void> {
    if (!this.client || !this.from) {
      this.logger.log(`[SMS-DEV] To: ${to} | Body: ${body}`);
      return;
    }

    try {
      await this.client.messages.create({ to, from: this.from, body });
      this.logger.log(`SMS sent to ${to}`);
    } catch (err) {
      this.logger.error(`Failed to send SMS to ${to}`, (err as Error).stack);
    }
  }
}
