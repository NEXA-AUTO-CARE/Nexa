import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role, User } from '../../database/entities';
import { AuthService } from './auth.service';

jest.mock('bcrypt');

const bcryptMock = bcrypt as jest.Mocked<typeof bcrypt>;

function makeUsers() {
  return {
    findByIdentifier: jest.fn(),
    findById: jest.fn(),
    createOtpPending: jest.fn(),
    markOtpVerified: jest.fn(),
    setPasswordHash: jest.fn(),
    toPublic: jest.fn(),
  };
}

function makeRoles() {
  return {
    findByName: jest.fn(),
    findByNameOrFail: jest.fn(),
    listPermissions: jest.fn().mockResolvedValue([]),
  };
}

function makeOtp() {
  return {
    issue: jest.fn(),
    verify: jest.fn(),
  };
}

function makeJwt() {
  return {
    signAsync: jest.fn().mockResolvedValue('signed-jwt'),
    verifyAsync: jest.fn(),
  };
}

function makeConfig() {
  return {
    getOrThrow: jest.fn((key: string) => {
      if (key === 'app.jwt.accessTtl') return 900;
      if (key === 'app.jwt.refreshTtl') return 2592000;
      throw new Error(`unexpected key: ${key}`);
    }),
  };
}

function makeRefreshRepo() {
  return {
    save: jest.fn(),
    create: jest.fn((x) => x),
    findOne: jest.fn(),
    update: jest.fn(),
  };
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    userId: 'user-1',
    roleId: 'role-1',
    role: { roleId: 'role-1', name: 'customer' } as Role,
    email: 'alice@example.com',
    phoneNumber: null,
    passwordHash: 'bcrypt-hash',
    otpVerified: true,
    displayName: 'Alice',
    firstName: null,
    lastName: null,
    createdOn: new Date(),
    ...overrides,
  } as User;
}

describe('AuthService', () => {
  let users: ReturnType<typeof makeUsers>;
  let roles: ReturnType<typeof makeRoles>;
  let otp: ReturnType<typeof makeOtp>;
  let jwt: ReturnType<typeof makeJwt>;
  let config: ReturnType<typeof makeConfig>;
  let refreshRepo: ReturnType<typeof makeRefreshRepo>;
  let service: AuthService;

  beforeEach(() => {
    users = makeUsers();
    roles = makeRoles();
    otp = makeOtp();
    jwt = makeJwt();
    config = makeConfig();
    refreshRepo = makeRefreshRepo();
    users.toPublic.mockReturnValue({
      userId: 'user-1',
      role: 'customer',
      permissions: [],
    } as never);
    service = new AuthService(
      users as never,
      roles as never,
      otp as never,
      jwt as never,
      config as never,
      refreshRepo as never,
    );
  });

  describe('signup', () => {
    it('rejects malformed identifiers', async () => {
      await expect(
        service.signup({ identifier: 'bad', role: 'customer' as never, displayName: 'A' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects admin or super_admin self-signup', async () => {
      await expect(
        service.signup({
          identifier: 'a@b.com',
          role: 'admin' as never,
          displayName: 'A',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.signup({
          identifier: 'a@b.com',
          role: 'super_admin' as never,
          displayName: 'A',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws Conflict if a user already exists with a password', async () => {
      roles.findByNameOrFail.mockResolvedValue({ roleId: 'r-c' } as Role);
      users.createOtpPending.mockResolvedValue(makeUser({ passwordHash: 'pre-existing' }));
      await expect(
        service.signup({
          identifier: 'a@b.com',
          role: 'customer' as never,
          displayName: 'A',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(otp.issue).not.toHaveBeenCalled();
    });

    it('creates the pending user and dispatches an OTP on success', async () => {
      roles.findByNameOrFail.mockResolvedValue({ roleId: 'r-c' } as Role);
      users.createOtpPending.mockResolvedValue(makeUser({ passwordHash: null }));
      otp.issue.mockResolvedValue('123456');
      await expect(
        service.signup({
          identifier: 'a@b.com',
          role: 'customer' as never,
          displayName: 'A',
        }),
      ).resolves.toEqual({ ok: true });
      expect(roles.findByNameOrFail).toHaveBeenCalledWith('customer');
      expect(otp.issue).toHaveBeenCalledWith('a@b.com');
    });
  });

  describe('verifyOtp', () => {
    it('throws Unauthorized when the identifier is unknown', async () => {
      users.findByIdentifier.mockResolvedValue(null);
      await expect(service.verifyOtp('a@b.com', '123456')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('marks the user OTP-verified and returns a setupToken on success', async () => {
      users.findByIdentifier.mockResolvedValue(makeUser());
      otp.verify.mockResolvedValue(undefined);
      jwt.signAsync.mockResolvedValue('setup-token-jwt');

      const result = await service.verifyOtp('alice@example.com', '123456');

      expect(otp.verify).toHaveBeenCalledWith('alice@example.com', '123456');
      expect(users.markOtpVerified).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ setupToken: 'setup-token-jwt' });
      expect(jwt.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'user-1', type: 'setup' }),
        expect.objectContaining({ expiresIn: 5 * 60 }),
      );
    });
  });

  describe('setPassword', () => {
    it('throws Unauthorized on an invalid setupToken', async () => {
      jwt.verifyAsync.mockRejectedValue(new Error('bad token'));
      await expect(service.setPassword('garbage', 'Password123!')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('throws Unauthorized when the token has the wrong type', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 'user-1', type: 'access' });
      await expect(service.setPassword('jwt', 'Password123!')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('hashes the password and issues new tokens', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: 'user-1', type: 'setup' });
      bcryptMock.hash.mockResolvedValue('bcrypt-hash' as never);
      users.findById.mockResolvedValue(makeUser());

      const result = await service.setPassword('valid', 'Password123!');

      expect(bcryptMock.hash).toHaveBeenCalledWith('Password123!', 12);
      expect(users.setPasswordHash).toHaveBeenCalledWith('user-1', 'bcrypt-hash');
      expect(refreshRepo.save).toHaveBeenCalled();
      expect(result.response.accessToken).toBe('signed-jwt');
      expect(typeof result.refreshToken).toBe('string');
      expect(result.refreshExpiresAt).toBeInstanceOf(Date);
    });
  });

  describe('login', () => {
    it('throws on unknown identifier', async () => {
      users.findByIdentifier.mockResolvedValue(null);
      await expect(service.login('a@b.com', 'pw')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('throws when the user has no password set yet', async () => {
      users.findByIdentifier.mockResolvedValue(makeUser({ passwordHash: null }));
      await expect(service.login('a@b.com', 'pw')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('throws when the OTP is unverified (mid-signup state)', async () => {
      users.findByIdentifier.mockResolvedValue(
        makeUser({ otpVerified: false, passwordHash: 'h' }),
      );
      await expect(service.login('a@b.com', 'pw')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('throws when bcrypt comparison fails', async () => {
      users.findByIdentifier.mockResolvedValue(makeUser());
      bcryptMock.compare.mockResolvedValue(false as never);
      await expect(service.login('a@b.com', 'wrong')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('returns access + refresh tokens on success', async () => {
      users.findByIdentifier.mockResolvedValue(makeUser());
      bcryptMock.compare.mockResolvedValue(true as never);
      roles.listPermissions.mockResolvedValue(['users:read.self']);

      const result = await service.login('alice@example.com', 'Password123!');

      expect(result.response.accessToken).toBe('signed-jwt');
      expect(jwt.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-1',
          role: 'customer',
          permissions: ['users:read.self'],
          type: 'access',
        }),
        expect.objectContaining({ expiresIn: 900 }),
      );
    });
  });

  describe('refresh', () => {
    it('throws when no cookie is present', async () => {
      await expect(service.refresh('')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws when the token row is missing or already revoked', async () => {
      refreshRepo.findOne.mockResolvedValue(null);
      await expect(service.refresh('rawcookie')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rotates the refresh token and issues fresh access on success', async () => {
      const row = { tokenHash: 'h', userId: 'user-1', revokedAt: null };
      refreshRepo.findOne.mockResolvedValue(row);
      refreshRepo.save.mockResolvedValue(row);
      users.findById.mockResolvedValue(makeUser());

      const result = await service.refresh('rawcookie');

      expect(row.revokedAt).toBeInstanceOf(Date);
      expect(refreshRepo.save).toHaveBeenCalledTimes(2);
      expect(result.response.accessToken).toBe('signed-jwt');
    });
  });

  describe('logout', () => {
    it('returns ok when no cookie is provided', async () => {
      await expect(service.logout(undefined)).resolves.toEqual({ ok: true });
      expect(refreshRepo.update).not.toHaveBeenCalled();
    });

    it('revokes the matching token via bulk update', async () => {
      refreshRepo.update.mockResolvedValue({});
      await service.logout('rawcookie');
      expect(refreshRepo.update).toHaveBeenCalled();
      const callArgs = refreshRepo.update.mock.calls[0];
      expect(callArgs[0]).toMatchObject({ tokenHash: expect.any(String) });
      expect(callArgs[1]).toMatchObject({ revokedAt: expect.any(Date) });
    });
  });
});
