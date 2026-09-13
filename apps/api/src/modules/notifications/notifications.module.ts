import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationLog } from '../../database/entities';
import { SettingsModule } from '../settings/settings.module';
import { EmailChannel } from './channels/email.channel';
import { SmsChannel } from './channels/sms.channel';
import { SnsChannel } from './channels/sns.channel';
import { WhatsAppChannel } from './channels/whatsapp.channel';
import { MessageTemplateService } from './message-template.service';
import { NotificationWebhookController } from './notification-webhook.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [SettingsModule, TypeOrmModule.forFeature([NotificationLog])],
  controllers: [NotificationWebhookController],
  providers: [
    EmailChannel,
    SmsChannel,
    SnsChannel,
    WhatsAppChannel,
    NotificationsService,
    MessageTemplateService,
  ],
  exports: [
    NotificationsService,
    MessageTemplateService,
    SnsChannel,
    WhatsAppChannel,
    SmsChannel,
    EmailChannel,
  ],
})
export class NotificationsModule {}
