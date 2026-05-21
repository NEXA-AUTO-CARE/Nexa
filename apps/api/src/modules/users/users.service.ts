import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Permission, PublicUser, UpdateUserAdminDto } from '@nexa/shared';
import { Repository } from 'typeorm';
import { Role, User } from '../../database/entities';
import { PublicUserDto } from './dto/public-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

export type UserIdentifierKind = 'email' | 'phone';

export interface IdentifierParts {
  kind: UserIdentifierKind;
  email: string | null;
  phoneNumber: string | null;
}

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RX = /^\+?[1-9]\d{6,14}$/;

export function parseIdentifier(identifier: string): IdentifierParts {
  const trimmed = identifier.trim();
  if (EMAIL_RX.test(trimmed)) {
    return { kind: 'email', email: trimmed.toLowerCase(), phoneNumber: null };
  }
  const phoneCandidate = trimmed.replace(/\s/g, '');
  if (PHONE_RX.test(phoneCandidate)) {
    return { kind: 'phone', email: null, phoneNumber: phoneCandidate };
  }
  throw new Error('Identifier must be a valid email or E.164-style phone number');
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\s/g, '');
}

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly userRepo: Repository<User>) {}

  async findById(userId: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { userId } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByIdentifier(identifier: string): Promise<User | null> {
    const parts = parseIdentifier(identifier);
    return this.userRepo.findOne({
      where: parts.email ? { email: parts.email } : { phoneNumber: parts.phoneNumber! },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email: normalizeEmail(email) } });
  }

  async findByPhone(phoneNumber: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { phoneNumber: normalizePhone(phoneNumber) } });
  }

  /**
   * Create a placeholder user pending OTP verification (no password yet).
   *
   * Idempotent on contact: if a pending row already exists for the same email or phone
   * AND the supplied details are consistent (same role, same names), the existing row is
   * returned. Any mismatch — different role, different name, or an existing password —
   * raises ConflictException so a half-signed-up account can't be silently inherited.
   */
  async createOtpPending(args: {
    firstName: string;
    lastName: string;
    email: string | null;
    phoneNumber: string | null;
    role: Role;
    displayName: string;
  }): Promise<User> {
    const email = args.email ? normalizeEmail(args.email) : null;
    const phoneNumber = args.phoneNumber ? normalizePhone(args.phoneNumber) : null;

    const existing = await this.findByContact(email, phoneNumber);
    if (existing) {
      if (existing.passwordHash) {
        throw new ConflictException('Account already exists; please log in instead');
      }
      const sameRole = existing.roleId === args.role.roleId;
      const sameFirst = (existing.firstName ?? '') === args.firstName;
      const sameLast = (existing.lastName ?? '') === args.lastName;
      if (!sameRole || !sameFirst || !sameLast) {
        throw new ConflictException(
          'An unfinished signup exists for this contact with different details',
        );
      }
      return existing;
    }

    const user = this.userRepo.create({
      firstName: args.firstName,
      lastName: args.lastName,
      email,
      phoneNumber,
      roleId: args.role.roleId,
      displayName: args.displayName,
      otpVerified: false,
      passwordHash: null,
    });
    return this.userRepo.save(user);
  }

  async markOtpVerified(userId: string): Promise<void> {
    const user = await this.findById(userId);
    user.otpVerified = true;
    await this.userRepo.save(user);
  }

  async setPasswordHash(userId: string, hash: string): Promise<void> {
    const user = await this.findById(userId);
    user.passwordHash = hash;
    await this.userRepo.save(user);
  }

  async update(userId: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(userId);
    Object.assign(user, dto);
    return this.userRepo.save(user);
  }

  /**
   * Project a User entity into the API-shaped PublicUser. The optional `permissions`
   * argument is the resolved permission catalog for that user's role; when omitted,
   * an empty array is returned (caller is responsible for fetching permissions when
   * they matter — typically only at JWT issuance and on /users/me).
   */
  toPublic(user: User, permissions: Permission[] = []): PublicUserDto {
    return {
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role?.name ?? 'customer',
      permissions,
      displayName: user.displayName,
      otpVerified: user.otpVerified,
      createdAt: user.createdOn.toISOString(),
      stripeAccountId: user.stripeAccountId,
    };
  }

  async findAllForAdmin(): Promise<User[]> {
    return this.userRepo.find({
      relations: ['role'],
      order: { createdOn: 'DESC' },
    });
  }

  async adminUpdateUser(userId: string, dto: UpdateUserAdminDto): Promise<User> {
    const user = await this.userRepo.findOne({ where: { userId }, relations: ['role'] });
    if (!user) throw new NotFoundException('User not found');

    if (dto.displayName !== undefined) {
      user.displayName = dto.displayName;
    }
    if (dto.stripeAccountId !== undefined) {
      user.stripeAccountId = dto.stripeAccountId;
    }
    if (dto.role !== undefined) {
      const role = await this.userRepo.manager.getRepository(Role).findOne({
        where: { name: dto.role },
      });
      if (!role) throw new NotFoundException(`Role ${dto.role} not found`);
      user.roleId = role.roleId;
      user.role = role;
    }

    return this.userRepo.save(user);
  }

  private async findByContact(
    email: string | null,
    phoneNumber: string | null,
  ): Promise<User | null> {
    if (email) {
      const byEmail = await this.userRepo.findOne({ where: { email } });
      if (byEmail) return byEmail;
    }
    if (phoneNumber) {
      const byPhone = await this.userRepo.findOne({ where: { phoneNumber } });
      if (byPhone) return byPhone;
    }
    return null;
  }
}
