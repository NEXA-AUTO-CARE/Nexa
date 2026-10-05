import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationLog } from '../../database/entities';
import { NotificationWebhookController } from './notification-webhook.controller';

describe('NotificationWebhookController', () => {
  let controller: NotificationWebhookController;
  let mockLogRepo: { update: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockLogRepo = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationWebhookController],
      providers: [
        {
          provide: getRepositoryToken(NotificationLog),
          useValue: mockLogRepo,
        },
      ],
    }).compile();

    controller = module.get<NotificationWebhookController>(
      NotificationWebhookController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleWhatsAppStatus', () => {
    it('should update status to delivered when MessageStatus is delivered', async () => {
      const res = await controller.handleWhatsAppStatus({
        MessageSid: 'SM12345',
        MessageStatus: 'delivered',
      });

      expect(res).toEqual({ received: true });
      expect(mockLogRepo.update).toHaveBeenCalledWith(
        { providerMessageId: 'SM12345' },
        expect.objectContaining({
          status: 'delivered',
        }),
      );
    });

    it('should update status to failed when MessageStatus is failed with error details', async () => {
      const res = await controller.handleWhatsAppStatus({
        MessageSid: 'SM67890',
        MessageStatus: 'failed',
        ErrorCode: '30008',
        ErrorMessage: 'Unknown error',
      });

      expect(res).toEqual({ received: true });
      expect(mockLogRepo.update).toHaveBeenCalledWith(
        { providerMessageId: 'SM67890' },
        expect.objectContaining({
          status: 'failed',
          errorMessage: '[30008] Unknown error',
        }),
      );
    });

    it('should return received without updating if MessageSid or MessageStatus is missing', async () => {
      const res = await controller.handleWhatsAppStatus({});
      expect(res).toEqual({ received: true });
      expect(mockLogRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('handleSnsNotification', () => {
    it('should process JSON delivery feedback message', async () => {
      const payload = {
        Type: 'Notification',
        MessageId: 'sns-msg-999',
        Message: JSON.stringify({
          notification: { messageId: 'sns-msg-999' },
          status: 'SUCCESS',
        }),
      };

      const res = await controller.handleSnsNotification(payload);

      expect(res).toEqual({ received: true });
      expect(mockLogRepo.update).toHaveBeenCalledWith(
        { providerMessageId: 'sns-msg-999' },
        expect.objectContaining({
          status: 'delivered',
        }),
      );
    });
  });
});
