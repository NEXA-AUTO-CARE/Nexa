import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PromotionType } from '@nexa/shared';
import { MessageTemplateService } from '../notifications/message-template.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import {
  DEFAULT_PROMOTION_TEMPLATES,
  PROMOTION_GENERIC_FALLBACK,
  PROMOTION_TEMPLATES_KEY,
} from './promotion.templates';
import { PromotionStartedEvent } from './events/promotion.events';

@Injectable()
export class PromotionsListener {
  private readonly logger = new Logger(PromotionsListener.name);

  constructor(
    private readonly notifications: NotificationsService,
    private readonly templateService: MessageTemplateService,
    private readonly usersService: UsersService,
  ) {}

  @OnEvent(PromotionStartedEvent.EVENT_NAME)
  async handlePromotionStarted(event: PromotionStartedEvent): Promise<void> {
    const { promotion } = event;
    this.logger.log(`[EVENT] promotion.started → broadcasting "${promotion.title}" to all customers`);

    const customers = await this.usersService.findAllCustomers();
    if (customers.length === 0) {
      this.logger.warn('No customers found to broadcast promotion to');
      return;
    }

    // Build the notification content
    const overrides = await this.templateService.loadOverrides(PROMOTION_TEMPLATES_KEY);
    const tpl = this.templateService.resolveTemplate(
      promotion.type,
      DEFAULT_PROMOTION_TEMPLATES,
      overrides,
      PROMOTION_GENERIC_FALLBACK,
    );

    // Broadcast to each customer
    let sent = 0;
    for (const customer of customers) {
      try {
        const ctx: Record<string, string | undefined> = {
          customerName: customer.displayName,
          promotionTitle: promotion.title,
          promotionMessage: promotion.message,
        };

        if (promotion.type === PromotionType.PERCENTAGE_DISCOUNT && promotion.discountPercent) {
          ctx['discountPercent'] = parseFloat(promotion.discountPercent).toString();
        }

        if (promotion.type === PromotionType.BONANZA && promotion.bonanzaThreshold) {
          ctx['bonanzaThreshold'] = promotion.bonanzaThreshold.toString();
        }

        const { subject, html } = this.templateService.buildEmail(tpl, ctx);
        const smsText = this.templateService.buildSms(tpl, ctx);

        await this.notifications.notify(customer, { subject, html, smsText });
        sent++;
      } catch (err) {
        this.logger.error(
          `Failed to notify customer ${customer.userId} for promotion "${promotion.title}"`,
          (err as Error).stack,
        );
      }
    }

    this.logger.log(`[EVENT] promotion.started → sent ${sent}/${customers.length} notifications`);
  }
}
