import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

@Injectable()
export class SnsChannel {
  private readonly logger = new Logger(SnsChannel.name);
  private snsClient: SNSClient | null = null;
  private defaultTopicArn: string | undefined;

  constructor(private readonly config: ConfigService) {
    const region = this.config.get<string>('app.sns.region') || process.env.AWS_REGION || 'us-east-1';
    this.defaultTopicArn = this.config.get<string>('app.sns.topicArn');

    // Initialize SNS client. We check if NODE_ENV is test to avoid active SDK instantiation in unit test suites
    if (process.env.NODE_ENV !== 'test') {
      try {
        this.snsClient = new SNSClient({ region });
        this.logger.log(`AWS SNS channel configured in region: ${region}`);
      } catch (err) {
        this.logger.warn(`AWS SNS Client initialization failed: ${(err as Error).message}`);
      }
    } else {
      this.logger.log('AWS SNS channel running in test/mock mode');
    }
  }

  /**
   * Publish direct SMS message via AWS SNS
   */
  async sendSms(phoneNumber: string, message: string): Promise<void> {
    if (!this.snsClient) {
      this.logger.log(`[SNS-SMS-DEV] To: ${phoneNumber} | Message: ${message}`);
      return;
    }

    try {
      await this.snsClient.send(
        new PublishCommand({
          PhoneNumber: phoneNumber,
          Message: message,
        })
      );
      this.logger.log(`Direct SMS sent via SNS to ${phoneNumber}`);
    } catch (err) {
      this.logger.error(`Failed to send SMS via SNS to ${phoneNumber}`, (err as Error).stack);
    }
  }

  /**
   * Publish a message to an SNS Topic
   */
  async publishToTopic(message: string, subject?: string, topicArn?: string): Promise<void> {
    const targetTopicArn = topicArn || this.defaultTopicArn;

    if (!targetTopicArn) {
      this.logger.warn('Cannot publish to SNS Topic — no topic ARN configured or provided');
      return;
    }

    if (!this.snsClient) {
      this.logger.log(`[SNS-TOPIC-DEV] Topic: ${targetTopicArn} | Subject: ${subject} | Message: ${message}`);
      return;
    }

    try {
      await this.snsClient.send(
        new PublishCommand({
          TopicArn: targetTopicArn,
          Message: message,
          Subject: subject,
        })
      );
      this.logger.log(`Message published to SNS Topic: ${targetTopicArn}`);
    } catch (err) {
      this.logger.error(`Failed to publish message to SNS Topic: ${targetTopicArn}`, (err as Error).stack);
    }
  }
}
