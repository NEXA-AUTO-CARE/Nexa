import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PublicUser, UserRole } from '@nexa/shared';
import { Repository } from 'typeorm';
import { User } from '../../database/entities';
import { UpdateUserDto } from './dto/update-user.dto';
import { DateUtils } from 'typeorm/util/DateUtils.js';

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
  if (PHONE_RX.test(trimmed.replace(/\s/g, ''))) {
    return { kind: 'phone', email: null, phoneNumber: trimmed.replace(/\s/g, '') };
  }
  throw new Error('Identifier must be a valid email or E.164-style phone number');
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

  /**
   * Create a placeholder user pending OTP verification (no password yet).
   * Idempotent on identifier — returns the existing pending user if one exists.
   */
  async createOtpPending(args: {
    identifier: string;
    role: UserRole;
    displayName: string;
  }): Promise<User> {
    const existing = await this.findByIdentifier(args.identifier);
    if (existing) return existing;

    const parts = parseIdentifier(args.identifier);
    const user = this.userRepo.create({
      email: parts.email,
      phoneNumber: parts.phoneNumber,
      role: args.role,
      displayName: args.displayName,
      otpVerified: false,
      passwordHash: null,
    });
    return this.userRepo.save(user);
  }

  async markOtpVerified(userId: string): Promise<void> {
    await this.userRepo.update({ userId }, { otpVerified: true });
  }

  async setPasswordHash(userId: string, hash: string): Promise<void> {
    await this.userRepo.update({ userId }, { passwordHash: hash });
  }

  async update(userId: string, dto: UpdateUserDto): Promise<User> {
    await this.userRepo.update({ userId }, dto);
    return this.findById(userId);
  }

  toPublic(user: User): PublicUser {
    return {
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      displayName: user.displayName,
      otpVerified: user.otpVerified,
      createdAt: DateUtils.mixedDateToDatetimeString(Date.now()), // TODO: add createdOn to User entity and use it here instead of current time
    };
  }
}
