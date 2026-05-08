import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Permission, PublicUser } from '@nexa/shared';
import { Repository } from 'typeorm';
import { Role, User } from '../../database/entities';
import { UpdateUserDto } from './dto/update-user.dto';

export type UserIdentifierKind = 'email' | 'phone';

export interface IdentifierParts {
  kind: UserIdentifierKind;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phoneNumber: string | null;
}

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RX = /^\+?[1-9]\d{6,14}$/;

export function parseIdentifier(identifier: string): IdentifierParts {
  const trimmed = identifier.trim();
  if (EMAIL_RX.test(trimmed)) {
    return { kind: 'email', firstName: null, lastName: null, email: trimmed.toLowerCase(), phoneNumber: null };
  }
  if (PHONE_RX.test(trimmed.replace(/\s/g, ''))) {
    return { kind: 'phone', firstName: null, lastName: null, email: null, phoneNumber: trimmed.replace(/\s/g, '') };
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
    role: Role;
    displayName: string;
  }): Promise<User> {
    const existing = await this.findByIdentifier(args.identifier);
    if (existing) return existing;

    const parts = parseIdentifier(args.identifier);
    const user = this.userRepo.create({
      firstName: parts.firstName,
      lastName: parts.lastName,
      email: parts.email,
      phoneNumber: parts.phoneNumber,
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
  toPublic(user: User, permissions: Permission[] = []): PublicUser {
    return {
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role.name,
      permissions,
      displayName: user.displayName,
      otpVerified: user.otpVerified,
      createdAt: user.createdOn.toISOString(),
    };
  }
}
