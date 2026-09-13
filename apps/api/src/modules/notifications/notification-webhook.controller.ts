import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotificationDeliveryStatus,
  NotificationLog,
} from '../../database/entities';

@Controller('notifications/webhooks')
export class NotificationWebhookController {
  private readonly logger = new Logger(NotificationWebhookController.name);

  constructor(
    @InjectRepository(NotificationLog)
    private readonly logRepo: Repository<NotificationLog>,
  ) {}

  /**
   * Handle Twilio WhatsApp & SMS status callbacks
   * Payload format: MessageSid, MessageStatus ('delivered' | 'failed' | 'undelivered' | 'sent'), ErrorCode, etc.
   */
  @Post('whatsapp')
  @HttpCode(HttpStatus.OK)
  async handleWhatsAppStatus(
    @Body()
    body: {
      MessageSid?: string;
      MessageStatus?: string;
      ErrorCode?: string;
      ErrorMessage?: string;
    },
  ): Promise<{ received: boolean }> {
    const messageSid = body.MessageSid;
    const status = body.MessageStatus;

    if (!messageSid || !status) {
      return { received: true };
    }

    this.logger.log(
      `[WEBHOOK-WHATSAPP] MessageSid: ${messageSid} -> Status: ${status}`,
    );

    let mappedStatus: NotificationDeliveryStatus = 'sent';
    if (status === 'delivered' || status === 'read') {
      mappedStatus = 'delivered';
    } else if (status === 'failed' || status === 'undelivered') {
      mappedStatus = 'failed';
    }

    await this.logRepo.update(
      { providerMessageId: messageSid },
      {
        status: mappedStatus,
        errorMessage: body.ErrorMessage
          ? `[${body.ErrorCode || 'ERROR'}] ${body.ErrorMessage}`
          : undefined,
        updatedAt: new Date(),
      },
    );

    return { received: true };
  }

  /**
   * Handle AWS SNS delivery status feedback HTTP notifications
   */
  @Post('sns')
  @HttpCode(HttpStatus.OK)
  async handleSnsNotification(
    @Body()
    body: {
      Type?: string;
      MessageId?: string;
      SubscribeURL?: string;
      Message?: string;
    },
  ): Promise<{ received: boolean }> {
    // 1. Handle AWS SNS HTTP subscription confirmation handshake
    if (body.Type === 'SubscriptionConfirmation' && body.SubscribeURL) {
      this.logger.log(
        `[WEBHOOK-SNS] Confirming SNS Subscription: ${body.SubscribeURL}`,
      );
      try {
        await fetch(body.SubscribeURL);
        this.logger.log('[WEBHOOK-SNS] Subscription successfully confirmed');
      } catch (err) {
        this.logger.error(
          `[WEBHOOK-SNS] Failed to confirm subscription: ${(err as Error).message}`,
        );
      }
      return { received: true };
    }

    // 2. Handle SNS delivery notification
    if (body.Type === 'Notification' && body.Message) {
      try {
        const parsed = JSON.parse(body.Message);
        const snsMessageId = parsed.notification?.messageId || body.MessageId;
        const status = parsed.status === 'SUCCESS' ? 'delivered' : 'failed';

        this.logger.log(
          `[WEBHOOK-SNS] Delivery feedback for ${snsMessageId} -> ${status}`,
        );

        if (snsMessageId) {
          await this.logRepo.update(
            { providerMessageId: snsMessageId },
            {
              status,
              errorMessage: parsed.delivery?.providerResponse || undefined,
              updatedAt: new Date(),
            },
          );
        }
      } catch {
        this.logger.warn('[WEBHOOK-SNS] Non-JSON notification message received');
      }
    }

    return { received: true };
  }
}
