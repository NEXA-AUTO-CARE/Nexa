import { UnauthorizedException } from '@nestjs/common';
import { OtpCode } from '../../database/entities';
import { OtpService } from './otp.service';

function makeRepo() {
  return {
    save: jest.fn(),
    create: jest.fn((x) => x),
    findOne: jest.fn(),
    delete: jest.fn(),
  };
}

function makeConfig(otpDevLog = true) {
  return { get: jest.fn().mockReturnValue(otpDevLog) };
}

function makeNotifications() {
  return {
    sendEmail: jest.fn().mockResolvedValue(undefined),
    sendSms: jest.fn().mockResolvedValue(undefined),
  };
}

function makeTemplateService() {
  return {
    process: jest.fn().mockResolvedValue({
      subject: 'Your OTP Code',
      html: '<p>123456</p>',
      smsText: 'Your code is 123456',
    }),
  };
}

describe('OtpService', () => {
  let repo: ReturnType<typeof makeRepo>;
  let config: ReturnType<typeof makeConfig>;
  let notifications: ReturnType<typeof makeNotifications>;
  let templateService: ReturnType<typeof makeTemplateService>;
  let service: OtpService;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    repo = makeRepo();
    config = makeConfig();
    notifications = makeNotifications();
    templateService = makeTemplateService();
    service = new OtpService(repo as never, config as never, notifications as never, templateService as never);
    logSpy = jest.spyOn((service as any).logger, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  describe('issue', () => {
    it('persists a new 6-digit code with a 10-minute expiry', async () => {
      repo.save.mockImplementation(async (entity) => entity);
      const before = Date.now();
      const code = await service.issue('alice@example.com');
      const after = Date.now();

      expect(code).toMatch(/^\d{6}$/);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          identifier: 'alice@example.com',
          code,
          expiresAt: expect.any(Date),
        }),
      );
      const persisted = repo.save.mock.calls[0][0] as OtpCode;
      const ttlMs = persisted.expiresAt.getTime() - before;
      expect(ttlMs).toBeGreaterThanOrEqual(10 * 60 * 1000 - 1000);
      expect(persisted.expiresAt.getTime() - after).toBeLessThanOrEqual(10 * 60 * 1000);
    });

    it('logs the OTP to stdout when OTP_DEV_LOG flag is on', async () => {
      repo.save.mockImplementation(async (entity) => entity);
      await service.issue('bob@example.com');
      expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/^\[OTP\] bob@example\.com -> \d{6}/));
    });

    it('does NOT log when OTP_DEV_LOG flag is off', async () => {
      config.get.mockReturnValue(false);
      service = new OtpService(repo as never, config as never, notifications as never, templateService as never);
      logSpy = jest.spyOn((service as any).logger, 'log').mockImplementation(() => {});
      repo.save.mockImplementation(async (entity) => entity);
      await service.issue('carol@example.com');
      expect(logSpy).not.toHaveBeenCalled();
    });
  });

  describe('verify', () => {
    it('marks the row consumed and returns void on success', async () => {
      const row: Partial<OtpCode> = {
        identifier: 'a@b.com',
        code: '123456',
        expiresAt: new Date(Date.now() + 60_000),
        consumedAt: null,
      };
      repo.findOne.mockResolvedValue(row);
      repo.save.mockResolvedValue(row);

      await service.verify('a@b.com', '123456');

      expect(row.consumedAt).toBeInstanceOf(Date);
      expect(repo.save).toHaveBeenCalledWith(row);
    });

    it('throws UnauthorizedException when no matching unused row exists', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.verify('a@b.com', '999999')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when the row has expired', async () => {
      repo.findOne.mockResolvedValue({
        identifier: 'a@b.com',
        code: '123456',
        expiresAt: new Date(Date.now() - 1_000),
        consumedAt: null,
      });
      await expect(service.verify('a@b.com', '123456')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('purgeExpired', () => {
    it('returns the number of rows deleted', async () => {
      repo.delete.mockResolvedValue({ affected: 7 });
      await expect(service.purgeExpired()).resolves.toBe(7);
    });

    it('returns 0 when affected is undefined', async () => {
      repo.delete.mockResolvedValue({});
      await expect(service.purgeExpired()).resolves.toBe(0);
    });
  });
});
