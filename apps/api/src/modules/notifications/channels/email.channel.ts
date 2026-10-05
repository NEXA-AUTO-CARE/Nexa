import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class EmailChannel {
  private readonly logger = new Logger(EmailChannel.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('app.smtp.host');
    const port = this.config.get<number>('app.smtp.port');
    const user = this.config.get<string>('app.smtp.user');
    const pass = this.config.get<string>('app.smtp.pass');

    if (host && port) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        auth: user && pass ? { user, pass } : undefined,
      });
      this.logger.log(`Email channel configured → ${host}:${port}`);
    } else {
      this.logger.warn('Email channel disabled — SMTP not configured');
    }
  }

  async send(
    to: string,
    subject: string,
    html: string,
  ): Promise<{ messageId?: string; success: boolean; error?: string }> {
    const from =
      this.config.get<string>('app.smtp.from') ?? 'NEXA <noreply@nexa.app>';

    if (!this.transporter) {
      const mockId = `mock-email-${Date.now()}`;
      this.logger.log(`[EMAIL-DEV] To: ${to} | Subject: ${subject}`);
      this.logger.debug(`[EMAIL-DEV] Body: ${html}`);
      return { messageId: mockId, success: true };
    }

    try {
      const info = await this.transporter.sendMail({ from, to, subject, html });
      this.logger.log(`Email sent to ${to}: "${subject}" (ID: ${info.messageId})`);
      return { messageId: info.messageId, success: true };
    } catch (err) {
      const errorMsg = (err as Error).message;
      this.logger.error(`Failed to send email to ${to}: ${errorMsg}`, (err as Error).stack);
      return { success: false, error: errorMsg };
    }
  }
}
