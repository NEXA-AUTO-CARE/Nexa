import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

export interface SnsSendSmsOptions {
  senderId?: string;
  smsType?: 'Transactional' | 'Promotional';
}

export interface SnsPublishResult {
  messageId?: string;
  success: boolean;
  error?: string;
}

@Injectable()
export class SnsChannel {
  private readonly logger = new Logger(SnsChannel.name);
  private snsClient: SNSClient | null = null;
  private defaultTopicArn: string | undefined;
  private defaultSenderId: string;
  private defaultSmsType: string;

  constructor(private readonly config: ConfigService) {
    const region =
      this.config.get<string>('app.sns.region') ||
      process.env.AWS_REGION ||
      'eu-west-2';
    this.defaultTopicArn = this.config.get<string>('app.sns.topicArn');
    this.defaultSenderId =
      this.config.get<string>('app.sns.senderId') || 'NEXA';
    this.defaultSmsType =
      this.config.get<string>('app.sns.smsType') || 'Transactional';

    // Initialize SNS client. We check if NODE_ENV is test to avoid active SDK instantiation in unit test suites
    if (process.env.NODE_ENV !== 'test') {
      try {
        this.snsClient = new SNSClient({ region });
        this.logger.log(
          `AWS SNS channel configured in region: ${region} (SenderId: ${this.defaultSenderId}, SMSType: ${this.defaultSmsType})`,
        );
      } catch (err) {
        this.logger.warn(
          `AWS SNS Client initialization failed: ${(err as Error).message}`,
        );
      }
    } else {
      this.logger.log('AWS SNS channel running in test/mock mode');
    }
  }

  /**
   * Publish direct SMS message via AWS SNS with UK Alphanumeric Sender ID & Transactional attributes
   */
  async sendSms(
    phoneNumber: string,
    message: string,
    options?: SnsSendSmsOptions,
  ): Promise<SnsPublishResult> {
    const senderId = options?.senderId || this.defaultSenderId;
    const smsType = options?.smsType || this.defaultSmsType;

    const messageAttributes: Record<
      string,
      { DataType: string; StringValue: string }
    > = {};

    if (senderId) {
      messageAttributes['AWS.SNS.SMS.SenderID'] = {
        DataType: 'String',
        StringValue: senderId,
      };
    }

    if (smsType) {
      messageAttributes['AWS.SNS.SMS.SMSType'] = {
        DataType: 'String',
        StringValue: smsType,
      };
    }

    if (!this.snsClient) {
      const mockId = `mock-sns-${Date.now()}`;
      this.logger.log(
        `[SNS-SMS-DEV] To: ${phoneNumber} | SenderID: ${senderId} | Type: ${smsType} | Message: ${message}`,
      );
      return { messageId: mockId, success: true };
    }

    try {
      const response = await this.snsClient.send(
        new PublishCommand({
          PhoneNumber: phoneNumber,
          Message: message,
          MessageAttributes: messageAttributes,
        }),
      );
      this.logger.log(
        `Direct SMS sent via SNS to ${phoneNumber} (MessageId: ${response.MessageId})`,
      );
      return { messageId: response.MessageId, success: true };
    } catch (err) {
      const errorMsg = (err as Error).message;
      this.logger.error(
        `Failed to send SMS via SNS to ${phoneNumber}: ${errorMsg}`,
        (err as Error).stack,
      );
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Publish a message to an SNS Topic
   */
  async publishToTopic(
    message: string,
    subject?: string,
    topicArn?: string,
  ): Promise<SnsPublishResult> {
    const targetTopicArn = topicArn || this.defaultTopicArn;

    if (!targetTopicArn) {
      this.logger.warn(
        'Cannot publish to SNS Topic — no topic ARN configured or provided',
      );
      return {
        success: false,
        error: 'No topic ARN configured or provided',
      };
    }

    if (!this.snsClient) {
      const mockId = `mock-topic-${Date.now()}`;
      this.logger.log(
        `[SNS-TOPIC-DEV] Topic: ${targetTopicArn} | Subject: ${subject} | Message: ${message}`,
      );
      return { messageId: mockId, success: true };
    }

    try {
      const response = await this.snsClient.send(
        new PublishCommand({
          TopicArn: targetTopicArn,
          Message: message,
          Subject: subject,
        }),
      );
      this.logger.log(
        `Message published to SNS Topic: ${targetTopicArn} (MessageId: ${response.MessageId})`,
      );
      return { messageId: response.MessageId, success: true };
    } catch (err) {
      const errorMsg = (err as Error).message;
      this.logger.error(
        `Failed to publish message to SNS Topic: ${targetTopicArn}: ${errorMsg}`,
        (err as Error).stack,
      );
      return { success: false, error: errorMsg };
    }
  }
}
