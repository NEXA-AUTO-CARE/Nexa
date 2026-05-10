import { Module } from '@nestjs/common';
import { EmailChannel } from './channels/email.channel';
import { SmsChannel } from './channels/sms.channel';
import { NotificationsService } from './notifications.service';

@Module({
  providers: [EmailChannel, SmsChannel, NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
