import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SnsChannel } from './sns.channel';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

// Mock the AWS SDK SNSClient
jest.mock('@aws-sdk/client-sns', () => {
  return {
    SNSClient: jest.fn().mockImplementation(() => {
      return {
        send: jest.fn(),
      };
    }),
    PublishCommand: jest.fn().mockImplementation((args) => args),
  };
});

describe('SnsChannel', () => {
  let channel: SnsChannel;
  let configService: ConfigService;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SnsChannel,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'app.sns.region') return 'us-east-1';
              if (key === 'app.sns.topicArn')
                return 'arn:aws:sns:us-east-1:123456789012:test-topic';
              if (key === 'app.sns.smsProvider') return 'sns';
              return null;
            }),
          },
        },
      ],
    }).compile();

    channel = module.get<SnsChannel>(SnsChannel);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(channel).toBeDefined();
  });

  describe('constructor', () => {
    it('should initialize the SNSClient with region from configuration', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      new SnsChannel(configService);

      expect(SNSClient).toHaveBeenCalledWith({ region: 'us-east-1' });
      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  describe('sendSms', () => {
    it('should send direct SMS via SNS Client with default SenderID and Transactional SMSType', async () => {
      const mockSend = jest
        .fn()
        .mockResolvedValue({ MessageId: 'msg-sns-123' });
      channel['snsClient'] = { send: mockSend } as any;

      const result = await channel.sendSms('+1234567890', 'Hello World');

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(PublishCommand).toHaveBeenCalledWith({
        PhoneNumber: '+1234567890',
        Message: 'Hello World',
        MessageAttributes: {
          'AWS.SNS.SMS.SenderID': {
            DataType: 'String',
            StringValue: 'NEXA',
          },
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Transactional',
          },
        },
      });
      expect(result).toEqual({ messageId: 'msg-sns-123', success: true });
    });

    it('should allow custom senderId and smsType overrides', async () => {
      const mockSend = jest
        .fn()
        .mockResolvedValue({ MessageId: 'msg-custom-456' });
      channel['snsClient'] = { send: mockSend } as any;

      const result = await channel.sendSms('+1234567890', 'Promo Alert', {
        senderId: 'NEXAPROMO',
        smsType: 'Promotional',
      });

      expect(PublishCommand).toHaveBeenCalledWith({
        PhoneNumber: '+1234567890',
        Message: 'Promo Alert',
        MessageAttributes: {
          'AWS.SNS.SMS.SenderID': {
            DataType: 'String',
            StringValue: 'NEXAPROMO',
          },
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Promotional',
          },
        },
      });
      expect(result).toEqual({ messageId: 'msg-custom-456', success: true });
    });

    it('should fall back to logging if SNS Client is not initialized', async () => {
      const loggerSpy = jest.spyOn(channel['logger'], 'log');
      channel['snsClient'] = null;

      const result = await channel.sendSms('+1234567890', 'Hello World');

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '[SNS-SMS-DEV] To: +1234567890 | SenderID: NEXA | Type: Transactional | Message: Hello World',
        ),
      );
      expect(result.success).toBe(true);
      expect(result.messageId).toContain('mock-sns-');
    });

    it('should catch errors and return error result when SDK call fails', async () => {
      const mockSend = jest
        .fn()
        .mockRejectedValue(new Error('Invalid parameter: PhoneNumber'));
      channel['snsClient'] = { send: mockSend } as any;

      const result = await channel.sendSms('invalid-phone', 'Hello Fail');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid parameter: PhoneNumber');
    });
  });

  describe('publishToTopic', () => {
    it('should publish to specified topic ARN', async () => {
      const mockSend = jest.fn().mockResolvedValue({});
      channel['snsClient'] = { send: mockSend } as any;

      await channel.publishToTopic(
        'Hello Topic',
        'Test Subject',
        'arn:aws:sns:us-east-1:123456789012:custom-topic',
      );

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(PublishCommand).toHaveBeenCalledWith({
        TopicArn: 'arn:aws:sns:us-east-1:123456789012:custom-topic',
        Message: 'Hello Topic',
        Subject: 'Test Subject',
      });
    });

    it('should fallback to default topic ARN if none specified', async () => {
      const mockSend = jest.fn().mockResolvedValue({});
      channel['snsClient'] = { send: mockSend } as any;

      await channel.publishToTopic(
        'Hello Default Topic',
        'Test Default Subject',
      );

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(PublishCommand).toHaveBeenCalledWith({
        TopicArn: 'arn:aws:sns:us-east-1:123456789012:test-topic',
        Message: 'Hello Default Topic',
        Subject: 'Test Default Subject',
      });
    });

    it('should log warning if no topic ARN is configured or specified', async () => {
      const warnSpy = jest.spyOn(channel['logger'], 'warn');
      channel['defaultTopicArn'] = undefined;

      await channel.publishToTopic('Hello Default Topic');

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Cannot publish to SNS Topic — no topic ARN configured or provided',
        ),
      );
    });
  });
});
