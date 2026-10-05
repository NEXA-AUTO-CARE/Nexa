import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotificationLog,
  User,
} from '../../database/entities';
import { EmailChannel } from './channels/email.channel';
import { SmsChannel } from './channels/sms.channel';
import { SnsChannel, SnsSendSmsOptions } from './channels/sns.channel';
import {
  WhatsAppChannel,
  WhatsAppSendOptions,
} from './channels/whatsapp.channel';
import { NotificationChannelType, NotificationDeliveryStatus } from 'src/database/entities/notification-log.entity';

export type NotificationChannel = 'email' | 'sms' | 'whatsapp' | 'sns';

export interface NotificationAuditContext {
  userId?: string;
  eventType?: string;
  metadata?: Record<string, unknown>;
}

export interface DeliveryResult {
  messageId?: string;
  success: boolean;
  channel: NotificationChannelType;
  provider: string;
  error?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly email: EmailChannel,
    private readonly sms: SmsChannel,
    private readonly sns: SnsChannel,
    private readonly whatsapp: WhatsAppChannel,
    private readonly config: ConfigService,
    @Optional()
    @InjectRepository(NotificationLog)
    private readonly logRepo?: Repository<NotificationLog>,
  ) { }

  /**
   * Safe asynchronous logging of notification dispatch attempts
   */
  private async recordAudit(
    recipient: string,
    channel: NotificationChannelType,
    provider: string,
    status: NotificationDeliveryStatus,
    options?: {
      userId?: string;
      providerMessageId?: string;
      eventType?: string;
      subject?: string;
      body?: string;
      errorMessage?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    if (!this.logRepo) return;

    try {
      await this.logRepo.save(
        this.logRepo.create({
          recipient,
          channel,
          provider,
          status,
          userId: options?.userId || null,
          providerMessageId: options?.providerMessageId || null,
          eventType: options?.eventType || null,
          subject: options?.subject || null,
          body: options?.body || null,
          errorMessage: options?.errorMessage || null,
          metadata: options?.metadata || null,
        }),
      );
    } catch (err) {
      this.logger.warn(
        `Failed to record notification audit log for ${recipient}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Determine the best notification channel based on available contact info.
   */
  resolveChannel(
    user: User,
  ): { channel: NotificationChannel; destination: string } | null {
    if (user.email) return { channel: 'email', destination: user.email };
    if (user.phoneNumber)
      return { channel: 'sms', destination: user.phoneNumber };
    this.logger.warn(`No contact info for user ${user.userId} — cannot notify`);
    return null;
  }

  /**
   * Send Email notification (via SES / Nodemailer)
   */
  async sendEmail(
    to: string,
    subject: string,
    html: string,
    audit?: NotificationAuditContext,
  ): Promise<DeliveryResult> {
    const res = await this.email.send(to, subject, html);
    const provider = this.config.get<string>('app.smtp.host')?.includes('ses')
      ? 'aws_ses'
      : 'smtp';

    await this.recordAudit(
      to,
      'email',
      provider,
      res.success ? 'sent' : 'failed',
      {
        userId: audit?.userId,
        eventType: audit?.eventType,
        providerMessageId: res.messageId,
        subject,
        body: html,
        errorMessage: res.error,
        metadata: audit?.metadata,
      },
    );

    return {
      messageId: res.messageId,
      success: res.success,
      channel: 'email',
      provider,
      error: res.error,
    };
  }

  /**
   * Send SMS notification (routes to AWS SNS with Transactional attributes or Twilio)
   */
  async sendSms(
    to: string,
    body: string,
    options?: SnsSendSmsOptions & NotificationAuditContext,
  ): Promise<DeliveryResult> {
    const provider =
      this.config.get<string>('app.sns.smsProvider') || 'twilio';

    let res: { messageId?: string; success: boolean; error?: string };

    if (provider === 'sns') {
      res = await this.sns.sendSms(to, body, options);
    } else {
      res = await this.sms.send(to, body);
    }

    const providerKey = provider === 'sns' ? 'aws_sns' : 'twilio';

    await this.recordAudit(
      to,
      'sms',
      providerKey,
      res.success ? 'sent' : 'failed',
      {
        userId: options?.userId,
        eventType: options?.eventType,
        providerMessageId: res.messageId,
        body,
        errorMessage: res.error,
        metadata: options?.metadata,
      },
    );

    return {
      messageId: res.messageId,
      success: res.success,
      channel: 'sms',
      provider: providerKey,
      error: res.error,
    };
  }

  /**
   * Send WhatsApp notification (via Twilio WhatsApp / Meta Cloud API)
   */
  async sendWhatsApp(
    to: string,
    body: string,
    options?: WhatsAppSendOptions & NotificationAuditContext,
  ): Promise<DeliveryResult> {
    const res = await this.whatsapp.send(to, body, options);
    const provider =
      this.config.get<string>('app.whatsapp.provider') || 'twilio';

    await this.recordAudit(
      to,
      'whatsapp',
      provider,
      res.success ? 'sent' : 'failed',
      {
        userId: options?.userId,
        eventType: options?.eventType,
        providerMessageId: res.messageId,
        body,
        errorMessage: res.error,
        metadata: options?.metadata,
      },
    );

    return {
      messageId: res.messageId,
      success: res.success,
      channel: 'whatsapp',
      provider,
      error: res.error,
    };
  }

  /**
   * Send a rich notification to an SNS topic
   */
  async sendSnsTopic(
    message: string,
    subject?: string,
    topicArn?: string,
    audit?: NotificationAuditContext,
  ): Promise<DeliveryResult> {
    const res = await this.sns.publishToTopic(message, subject, topicArn);
    const destination =
      topicArn ||
      this.config.get<string>('app.sns.topicArn') ||
      'nexa-notifications';

    await this.recordAudit(
      destination,
      'sns_topic',
      'aws_sns',
      res.success ? 'sent' : 'failed',
      {
        userId: audit?.userId,
        eventType: audit?.eventType,
        providerMessageId: res.messageId,
        subject,
        body: message,
        errorMessage: res.error,
        metadata: audit?.metadata,
      },
    );

    return {
      messageId: res.messageId,
      success: res.success,
      channel: 'sns_topic',
      provider: 'aws_sns',
      error: res.error,
    };
  }

  /**
   * Auto-route notification to the user's preferred channel with smart cascading fallback:
   * 1. Try WhatsApp first if phone available and enabled.
   * 2. If WhatsApp fails (user not on WhatsApp or delivery error), immediately fallback to AWS SNS SMS.
   * 3. Always dispatch rich confirmation Email if user has email address.
   */
  async notify(
    user: User,
    content: {
      subject: string;
      html: string;
      smsText: string;
      whatsAppText?: string;
    },
    options?: NotificationAuditContext & { preferWhatsApp?: boolean },
  ): Promise<void> {
    const auditContext: NotificationAuditContext = {
      userId: user.userId,
      eventType: options?.eventType || 'notification',
      metadata: options?.metadata,
    };

    let phoneHandled = false;

    // A. Handle phone notifications (WhatsApp with smart fallback to SMS)
    if (user.phoneNumber) {
      const preferWhatsApp = options?.preferWhatsApp ?? true;

      if (preferWhatsApp) {
        const text = content.whatsAppText || content.smsText;
        const waResult = await this.sendWhatsApp(
          user.phoneNumber,
          text,
          auditContext,
        );

        if (waResult.success) {
          phoneHandled = true;
          this.logger.log(
            `[NOTIFY] WhatsApp delivered to ${user.phoneNumber} (ID: ${waResult.messageId})`,
          );
        } else {
          this.logger.warn(
            `[NOTIFY-FALLBACK] WhatsApp failed for ${user.phoneNumber} (${waResult.error}) → Cascading to SMS`,
          );
        }
      }

      // If WhatsApp failed or wasn't preferred, dispatch SMS
      if (!phoneHandled) {
        const smsResult = await this.sendSms(
          user.phoneNumber,
          content.smsText,
          {
            ...auditContext,
            smsType: 'Transactional',
          },
        );
        this.logger.log(
          `[NOTIFY] SMS sent to ${user.phoneNumber} (ID: ${smsResult.messageId})`,
        );
      }
    }

    // B. If user has email, send email for persistent receipt/record
    if (user.email) {
      await this.sendEmail(
        user.email,
        content.subject,
        content.html,
        auditContext,
      );
    }
  }
}
