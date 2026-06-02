import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { EmailChannel } from './channels/email.channel';
import { SmsChannel } from './channels/sms.channel';
import { SnsChannel } from './channels/sns.channel';
import { MessageTemplateService } from './message-template.service';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [SettingsModule],
  providers: [EmailChannel, SmsChannel, SnsChannel, NotificationsService, MessageTemplateService],
  exports: [NotificationsService, MessageTemplateService],
})
export class NotificationsModule {}
