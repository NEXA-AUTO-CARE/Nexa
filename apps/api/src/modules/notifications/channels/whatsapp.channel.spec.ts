import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WhatsAppChannel } from './whatsapp.channel';

describe('WhatsAppChannel', () => {
  let channel: WhatsAppChannel;
  let configService: ConfigService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppChannel,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'app.twilio.sid') return 'AC_fake_sid_123';
              if (key === 'app.twilio.token') return 'fake_token_123';
              if (key === 'app.whatsapp.from') return '+14155238886';
              return null;
            }),
          },
        },
      ],
    }).compile();

    channel = module.get<WhatsAppChannel>(WhatsAppChannel);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(channel).toBeDefined();
  });

  describe('formatting phone number', () => {
    it('should format international phone to whatsapp format', () => {
      const formatted = channel['formatWhatsAppNumber']('+447123456789');
      expect(formatted).toBe('whatsapp:+447123456789');
    });

    it('should leave already prefixed whatsapp numbers untouched', () => {
      const formatted = channel['formatWhatsAppNumber'](
        'whatsapp:+447123456789',
      );
      expect(formatted).toBe('whatsapp:+447123456789');
    });
  });

  describe('send', () => {
    it('should fall back to dev logging when client is not initialized', async () => {
      const loggerSpy = jest.spyOn(channel['logger'], 'log');
      channel['client'] = null;

      const result = await channel.send('+447123456789', 'Hello on WhatsApp');

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '[WHATSAPP-DEV] To: whatsapp:+447123456789 | From: whatsapp:+14155238886 | Body: Hello on WhatsApp',
        ),
      );
      expect(result.success).toBe(true);
      expect(result.messageId).toContain('mock-wa-');
    });

    it('should call twilio create message when client is initialized', async () => {
      const mockCreate = jest
        .fn()
        .mockResolvedValue({ sid: 'SM_whatsapp_123' });
      channel['client'] = { messages: { create: mockCreate } } as any;

      const result = await channel.send('+447123456789', 'Booking Confirmed');

      expect(mockCreate).toHaveBeenCalledWith({
        to: 'whatsapp:+447123456789',
        from: 'whatsapp:+14155238886',
        body: 'Booking Confirmed',
      });
      expect(result).toEqual({
        messageId: 'SM_whatsapp_123',
        success: true,
      });
    });

    it('should support mediaUrl attachments and contentSid template options', async () => {
      const mockCreate = jest
        .fn()
        .mockResolvedValue({ sid: 'SM_whatsapp_media' });
      channel['client'] = { messages: { create: mockCreate } } as any;

      const result = await channel.send(
        '+447123456789',
        '',
        {
          mediaUrl: ['https://nexa.test/photos/after.jpg'],
          contentSid: 'HX123456',
          contentVariables: { '1': 'Godswill' },
        },
      );

      expect(mockCreate).toHaveBeenCalledWith({
        to: 'whatsapp:+447123456789',
        from: 'whatsapp:+14155238886',
        mediaUrl: ['https://nexa.test/photos/after.jpg'],
        contentSid: 'HX123456',
        contentVariables: JSON.stringify({ '1': 'Godswill' }),
      });
      expect(result.success).toBe(true);
    });

    it('should catch twilio errors and return failure result', async () => {
      const mockCreate = jest
        .fn()
        .mockRejectedValue(new Error('Channel whatsapp not activated'));
      channel['client'] = { messages: { create: mockCreate } } as any;

      const result = await channel.send('+447123456789', 'Fail Test');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Channel whatsapp not activated');
    });
  });
});
