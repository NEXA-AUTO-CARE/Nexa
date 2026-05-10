import { Injectable, Logger } from '@nestjs/common';
import { User } from '../../database/entities';
import { EmailChannel } from './channels/email.channel';
import { SmsChannel } from './channels/sms.channel';

export type NotificationChannel = 'email' | 'sms';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly email: EmailChannel,
    private readonly sms: SmsChannel,
  ) {}

  /**
   * Determine the best notification channel based on available contact info.
   * Email takes priority (richer content, cheaper).
   */
  resolveChannel(user: User): { channel: NotificationChannel; destination: string } | null {
    if (user.email) return { channel: 'email', destination: user.email };
    if (user.phoneNumber) return { channel: 'sms', destination: user.phoneNumber };
    this.logger.warn(`No contact info for user ${user.userId} — cannot notify`);
    return null;
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    return this.email.send(to, subject, html);
  }

  async sendSms(to: string, body: string): Promise<void> {
    return this.sms.send(to, body);
  }

  /**
   * Auto-route notification to the user's preferred channel.
   */
  async notify(
    user: User,
    content: { subject: string; html: string; smsText: string },
  ): Promise<void> {
    const target = this.resolveChannel(user);
    if (!target) return;

    if (target.channel === 'email') {
      await this.sendEmail(target.destination, content.subject, content.html);
    } else {
      await this.sendSms(target.destination, content.smsText);
    }
  }
}
