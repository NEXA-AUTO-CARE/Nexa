import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationLog, User } from '../../database/entities';
import { EmailChannel } from './channels/email.channel';
import { SmsChannel } from './channels/sms.channel';
import { SnsChannel } from './channels/sns.channel';
import { WhatsAppChannel } from './channels/whatsapp.channel';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let emailChannel: EmailChannel;
  let smsChannel: SmsChannel;
  let snsChannel: SnsChannel;
  let whatsAppChannel: WhatsAppChannel;
  let mockLogRepo: { create: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockLogRepo = {
      create: jest.fn((dto) => dto),
      save: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: EmailChannel,
          useValue: {
            send: jest
              .fn()
              .mockResolvedValue({ messageId: 'email-1', success: true }),
          },
        },
        {
          provide: SmsChannel,
          useValue: {
            send: jest
              .fn()
              .mockResolvedValue({ messageId: 'sms-twilio-1', success: true }),
          },
        },
        {
          provide: SnsChannel,
          useValue: {
            sendSms: jest
              .fn()
              .mockResolvedValue({ messageId: 'sns-sms-1', success: true }),
            publishToTopic: jest
              .fn()
              .mockResolvedValue({ messageId: 'sns-topic-1', success: true }),
          },
        },
        {
          provide: WhatsAppChannel,
          useValue: {
            send: jest
              .fn()
              .mockResolvedValue({ messageId: 'wa-1', success: true }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'app.sns.smsProvider') return 'sns';
              if (key === 'app.whatsapp.provider') return 'twilio';
              if (key === 'app.smtp.host') return 'email-smtp.eu-west-2.amazonaws.com';
              return null;
            }),
          },
        },
        {
          provide: getRepositoryToken(NotificationLog),
          useValue: mockLogRepo,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    emailChannel = module.get<EmailChannel>(EmailChannel);
    smsChannel = module.get<SmsChannel>(SmsChannel);
    snsChannel = module.get<SnsChannel>(SnsChannel);
    whatsAppChannel = module.get<WhatsAppChannel>(WhatsAppChannel);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('resolveChannel', () => {
    it('should prioritize email when email is available', () => {
      const user = {
        userId: 'u1',
        email: 'test@example.com',
        phoneNumber: '+447123456789',
      } as User;
      const res = service.resolveChannel(user);
      expect(res).toEqual({ channel: 'email', destination: 'test@example.com' });
    });

    it('should choose sms when only phone is available', () => {
      const user = {
        userId: 'u1',
        email: null,
        phoneNumber: '+447123456789',
      } as User;
      const res = service.resolveChannel(user);
      expect(res).toEqual({ channel: 'sms', destination: '+447123456789' });
    });

    it('should return null when neither email nor phone is present', () => {
      const user = { userId: 'u1', email: null, phoneNumber: null } as User;
      const res = service.resolveChannel(user);
      expect(res).toBeNull();
    });
  });

  describe('sendEmail', () => {
    it('should send email and record audit log', async () => {
      const res = await service.sendEmail(
        'customer@test.com',
        'Subject',
        '<p>Hello</p>',
        { userId: 'u-123', eventType: 'booking.created' },
      );

      expect(emailChannel.send).toHaveBeenCalledWith(
        'customer@test.com',
        'Subject',
        '<p>Hello</p>',
      );
      expect(res.success).toBe(true);
      expect(mockLogRepo.save).toHaveBeenCalled();
    });
  });

  describe('sendSms', () => {
    it('should route to SNS channel when provider is sns', async () => {
      const res = await service.sendSms('+447123456789', 'Your OTP is 123456');

      expect(snsChannel.sendSms).toHaveBeenCalledWith(
        '+447123456789',
        'Your OTP is 123456',
        undefined,
      );
      expect(res.provider).toBe('aws_sns');
      expect(mockLogRepo.save).toHaveBeenCalled();
    });
  });

  describe('sendWhatsApp', () => {
    it('should route to WhatsAppChannel and log attempt', async () => {
      const res = await service.sendWhatsApp(
        '+447123456789',
        'Your detailing job is confirmed!',
      );

      expect(whatsAppChannel.send).toHaveBeenCalledWith(
        '+447123456789',
        'Your detailing job is confirmed!',
        undefined,
      );
      expect(res.channel).toBe('whatsapp');
      expect(mockLogRepo.save).toHaveBeenCalled();
    });
  });

  describe('notify with Smart Cascading Fallback', () => {
    it('should deliver via WhatsApp and Email when user has both phone and email', async () => {
      const user = {
        userId: 'u1',
        phoneNumber: '+447123456789',
        email: 'user@nexa.test',
      } as User;

      await service.notify(user, {
        subject: 'Booking Confirmed',
        html: '<p>HTML body</p>',
        smsText: 'SMS body',
        whatsAppText: 'WhatsApp body',
      });

      expect(whatsAppChannel.send).toHaveBeenCalledWith(
        '+447123456789',
        'WhatsApp body',
        expect.anything(),
      );
      expect(emailChannel.send).toHaveBeenCalledWith(
        'user@nexa.test',
        'Booking Confirmed',
        '<p>HTML body</p>',
      );
      expect(snsChannel.sendSms).not.toHaveBeenCalled();
    });

    it('should cascade to SMS when WhatsApp send fails', async () => {
      (whatsAppChannel.send as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Not a WhatsApp user',
      });

      const user = {
        userId: 'u2',
        phoneNumber: '+447123456789',
        email: null,
      } as User;

      await service.notify(user, {
        subject: 'Booking Status',
        html: '<p>Status</p>',
        smsText: 'Your car is ready',
      });

      expect(whatsAppChannel.send).toHaveBeenCalled();
      expect(snsChannel.sendSms).toHaveBeenCalledWith(
        '+447123456789',
        'Your car is ready',
        expect.objectContaining({ smsType: 'Transactional' }),
      );
    });
  });
});
