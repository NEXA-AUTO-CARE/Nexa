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
    it('should send direct SMS via SNS Client', async () => {
      const mockSend = jest.fn().mockResolvedValue({});
      channel['snsClient'] = { send: mockSend } as any;

      await channel.sendSms('+1234567890', 'Hello World');

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(PublishCommand).toHaveBeenCalledWith({
        PhoneNumber: '+1234567890',
        Message: 'Hello World',
      });
    });

    it('should fall back to logging if SNS Client is not initialized', async () => {
      const loggerSpy = jest.spyOn(channel['logger'], 'log');
      channel['snsClient'] = null;

      await channel.sendSms('+1234567890', 'Hello World');

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '[SNS-SMS-DEV] To: +1234567890 | Message: Hello World',
        ),
      );
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
