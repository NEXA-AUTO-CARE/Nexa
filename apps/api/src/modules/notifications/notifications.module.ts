import { Module } from '@nestjs/common';
import { EmailChannel } from './channels/email.channel';
import { SmsChannel } from './channels/sms.channel';
import { SnsChannel } from './channels/sns.channel';
import { NotificationsService } from './notifications.service';

@Module({
  providers: [EmailChannel, SmsChannel, SnsChannel, NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
