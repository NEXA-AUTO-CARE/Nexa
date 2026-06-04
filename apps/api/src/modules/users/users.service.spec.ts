import { NotFoundException } from '@nestjs/common';
import { Role, User } from '../../database/entities';
import { UsersService } from './users.service';

type Mocked<T> = { [K in keyof T]: jest.Mock };

function makeRepo(): Mocked<{
  findOne: any;
  create: any;
  save: any;
}> {
  return {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
}

function makeUser(overrides: Partial<User> = {}): User {
  const now = new Date('2026-05-09T12:00:00.000Z');
  return {
    userId: 'user-1',
    firstName: null,
    lastName: null,
    email: 'alice@example.com',
    phoneNumber: null,
    passwordHash: null,
    roleId: 'role-1',
    role: { roleId: 'role-1', name: 'customer' } as Role,
    displayName: 'Alice',
    otpVerified: false,
    vehicles: [],
    bookings: [],
    createdOn: now,
    createdBy: null,
    updatedOn: null,
    updatedBy: null,
    approvedOn: null,
    approvedBy: null,
    ...overrides,
  } as User;
}

describe('UsersService', () => {
  let repo: ReturnType<typeof makeRepo>;
  let service: UsersService;

  beforeEach(() => {
    repo = makeRepo();
    service = new UsersService(repo as never);
  });

  describe('findById', () => {
    it('returns the user when found', async () => {
      const user = makeUser();
      repo.findOne.mockResolvedValue(user);
      await expect(service.findById('user-1')).resolves.toBe(user);
      expect(repo.findOne).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    });

    it('throws NotFoundException when missing', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findById('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findByIdentifier', () => {
    it('queries by email when identifier is an email', async () => {
      repo.findOne.mockResolvedValue(null);
      await service.findByIdentifier('Alice@Example.com');
      expect(repo.findOne).toHaveBeenCalledWith({ where: { email: 'alice@example.com' } });
    });

    it('queries by phone when identifier is a phone number', async () => {
      repo.findOne.mockResolvedValue(null);
      await service.findByIdentifier('+447700900123');
      expect(repo.findOne).toHaveBeenCalledWith({ where: { phoneNumber: '+447700900123' } });
    });

    it('returns null when no match', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findByIdentifier('nobody@example.com')).resolves.toBeNull();
    });
  });

  describe('createOtpPending', () => {
    it('updates and saves the existing pending user when details match', async () => {
      const existing = makeUser({
        otpVerified: false,
        firstName: 'Alice',
        lastName: 'Smith',
        roleId: 'role-1',
        passwordHash: null,
      });
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockImplementation(async (e) => e);
      const result = await service.createOtpPending({
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        phoneNumber: null,
        role: { roleId: 'role-1' } as Role,
        displayName: 'Alice',
      });
      expect(result).toBe(existing);
      expect(repo.save).toHaveBeenCalledWith(existing);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('throws Conflict when an existing user already has a password', async () => {
      const { ConflictException } = require('@nestjs/common');
      const existing = makeUser({ passwordHash: 'pre-existing' });
      repo.findOne.mockResolvedValue(existing);
      await expect(
        service.createOtpPending({
          firstName: 'Alice',
          lastName: 'Smith',
          email: 'alice@example.com',
          phoneNumber: null,
          role: { roleId: 'role-1' } as Role,
          displayName: 'Alice',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('overwrites profile fields when the existing pending user has a different role', async () => {
      const existing = makeUser({
        firstName: 'Alice',
        lastName: 'Smith',
        roleId: 'role-other',
        passwordHash: null,
        displayName: 'Old Name',
      });
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockImplementation(async (e) => e);
      const result = await service.createOtpPending({
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        phoneNumber: null,
        role: { roleId: 'role-1' } as Role,
        displayName: 'Alice Smith',
      });
      expect(result.roleId).toBe('role-1');
      expect(result.displayName).toBe('Alice Smith');
      expect(repo.save).toHaveBeenCalledWith(existing);
    });

    it('overwrites profile fields when the existing pending user has different names', async () => {
      const existing = makeUser({
        firstName: 'Bob',
        lastName: 'Jones',
        roleId: 'role-1',
        passwordHash: null,
        displayName: 'Bob Jones',
      });
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockImplementation(async (e) => e);
      const result = await service.createOtpPending({
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        phoneNumber: null,
        role: { roleId: 'role-1' } as Role,
        displayName: 'Alice Smith',
      });
      expect(result.firstName).toBe('Alice');
      expect(result.lastName).toBe('Smith');
      expect(result.displayName).toBe('Alice Smith');
      expect(repo.save).toHaveBeenCalledWith(existing);
    });

    it('creates a new pending user with the role-id derived from the role argument', async () => {
      repo.findOne.mockResolvedValue(null);
      const draft = { email: 'bob@example.com' } as Partial<User>;
      repo.create.mockReturnValue(draft);
      repo.save.mockImplementation(async (entity) => entity);

      const result = await service.createOtpPending({
        firstName: 'Bob',
        lastName: 'Jones',
        email: 'BOB@example.com',
        phoneNumber: null,
        role: { roleId: 'vendor-role' } as Role,
        displayName: 'Bob Jones',
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'Bob',
          lastName: 'Jones',
          email: 'bob@example.com',
          phoneNumber: null,
          roleId: 'vendor-role',
          displayName: 'Bob Jones',
          otpVerified: false,
          passwordHash: null,
        }),
      );
      expect(repo.save).toHaveBeenCalledWith(draft);
      expect(result).toBe(draft);
    });

    it('routes phone-only signups to the phone column', async () => {
      repo.findOne.mockResolvedValue(null);
      const draft = {} as Partial<User>;
      repo.create.mockReturnValue(draft);
      repo.save.mockResolvedValue(draft);

      await service.createOtpPending({
        firstName: 'Carol',
        lastName: 'Lee',
        email: null,
        phoneNumber: '+44 7700 900 123',
        role: { roleId: 'role-1' } as Role,
        displayName: 'Carol',
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: null,
          phoneNumber: '+447700900123',
        }),
      );
    });
  });

  describe('markOtpVerified / setPasswordHash / update — all use load-then-save so AuditSubscriber fires', () => {
    it('markOtpVerified mutates and saves the loaded user', async () => {
      const user = makeUser({ otpVerified: false });
      repo.findOne.mockResolvedValue(user);
      repo.save.mockResolvedValue(user);

      await service.markOtpVerified('user-1');

      expect(user.otpVerified).toBe(true);
      expect(repo.save).toHaveBeenCalledWith(user);
    });

    it('setPasswordHash sets the hash on the entity and saves', async () => {
      const user = makeUser({ passwordHash: null });
      repo.findOne.mockResolvedValue(user);
      repo.save.mockResolvedValue(user);

      await service.setPasswordHash('user-1', 'bcrypt-hash');

      expect(user.passwordHash).toBe('bcrypt-hash');
      expect(repo.save).toHaveBeenCalledWith(user);
    });

    it('update applies the patch via Object.assign and saves', async () => {
      const user = makeUser({ displayName: 'Old' });
      repo.findOne.mockResolvedValue(user);
      repo.save.mockImplementation(async (e) => e);

      const result = await service.update('user-1', { displayName: 'New' });

      expect(result.displayName).toBe('New');
      expect(repo.save).toHaveBeenCalledWith(user);
    });
  });

  describe('toPublic', () => {
    it('projects the user, exposing role.name and ISO createdOn', () => {
      const user = makeUser({
        userId: 'u-1',
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        role: { roleId: 'r-1', name: 'customer' } as Role,
        createdOn: new Date('2026-05-09T12:00:00.000Z'),
      });

      const result = service.toPublic(user, ['users:read.self', 'bookings:create'] as never);

      expect(result).toEqual({
        userId: 'u-1',
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        phoneNumber: null,
        role: 'customer',
        permissions: ['users:read.self', 'bookings:create'],
        displayName: 'Alice',
        otpVerified: false,
        createdAt: '2026-05-09T12:00:00.000Z',
      });
    });

    it('defaults permissions to an empty array when none are provided', () => {
      const user = makeUser();
      expect(service.toPublic(user).permissions).toEqual([]);
    });
  });
});
