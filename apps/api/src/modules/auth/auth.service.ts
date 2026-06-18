import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AuthResponse,
  OtpChannel,
  Permission,
  PublicUser,
  UserRole,
} from '@nexa/shared';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { RefreshToken, User } from '../../database/entities';
import { VendorApprovalStatus } from '../../database/entities/vendor-profile.entity';
import { RolesService } from '../roles/roles.service';
import {
  UsersService,
  normalizeEmail,
  normalizePhone,
} from '../users/users.service';
import { OtpService } from './otp.service';
import { MessageTemplateService } from '../notifications/message-template.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  AUTH_NOTIFICATION_TEMPLATES_KEY,
  DEFAULT_AUTH_TEMPLATES,
} from '../notifications/templates/auth.templates';

const BCRYPT_ROUNDS = 12;
const SETUP_TOKEN_TTL_SECONDS = 5 * 60;
const SETUP_TOKEN_AUDIENCE = 'nexa:set-password';
const RESET_TOKEN_TTL_SECONDS = 15 * 60;
const RESET_TOKEN_AUDIENCE = 'nexa:reset-password';

const SELF_SIGNUP_ROLES: ReadonlySet<string> = new Set([UserRole.CUSTOMER]);

interface SetupTokenPayload {
  sub: string;
  type: 'setup';
  aud: typeof SETUP_TOKEN_AUDIENCE;
}

interface ResetTokenPayload {
  sub: string;
  type: 'reset';
  aud: typeof RESET_TOKEN_AUDIENCE;
}

interface AccessTokenPayload {
  sub: string;
  role: string;
  permissions: Permission[];
  type: 'access';
}

export interface AuthIssueResult {
  response: AuthResponse;
  refreshToken: string;
  refreshExpiresAt: Date;
}

export interface SignupArgs {
  firstName: string;
  lastName: string;
  email: string | null;
  phoneNumber: string | null;
  role: UserRole;
  otpChannel: OtpChannel;
  displayName?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersService,
    private readonly roles: RolesService,
    private readonly otp: OtpService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
    private readonly templateService: MessageTemplateService,
    @InjectRepository(RefreshToken)
    private readonly refreshRepo: Repository<RefreshToken>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async signup(args: SignupArgs): Promise<{ ok: true }> {
    if (!SELF_SIGNUP_ROLES.has(args.role)) {
      throw new BadRequestException('Only customer accounts can self-register');
    }

    const email = args.email ? normalizeEmail(args.email) : null;
    const phoneNumber = args.phoneNumber
      ? normalizePhone(args.phoneNumber)
      : null;

    if (!email && !phoneNumber) {
      throw new BadRequestException('Provide an email or a phone number');
    }
    if (args.otpChannel === 'email' && !email) {
      throw new BadRequestException(
        'OTP channel "email" requires an email address',
      );
    }
    if (args.otpChannel === 'phone' && !phoneNumber) {
      throw new BadRequestException(
        'OTP channel "phone" requires a phone number',
      );
    }

    const otpTarget = args.otpChannel === 'email' ? email! : phoneNumber!;

    const role = await this.roles.findByNameOrFail(args.role);
    const displayName =
      args.displayName?.trim() || `${args.firstName} ${args.lastName}`.trim();

    await this.users.createOtpPending({
      firstName: args.firstName,
      lastName: args.lastName,
      email,
      phoneNumber,
      role,
      displayName,
    });

    await this.otp.issue(otpTarget, displayName);
    this.logger.log(`Signup initiated for user role ${args.role} (OTP sent)`);
    return { ok: true };
  }

  async verifyOtp(
    identifier: string,
    code: string,
  ): Promise<{ setupToken: string }> {
    const user = await this.users.findByIdentifier(identifier);
    if (!user) throw new UnauthorizedException('Unknown identifier');
    await this.otp.verify(identifier, code);
    await this.users.markOtpVerified(user.userId);
    const payload: SetupTokenPayload = {
      sub: user.userId,
      type: 'setup',
      aud: SETUP_TOKEN_AUDIENCE,
    };
    const setupToken = await this.jwt.signAsync(payload, {
      expiresIn: SETUP_TOKEN_TTL_SECONDS,
    });
    return { setupToken };
  }

  async setPassword(
    setupToken: string,
    password: string,
  ): Promise<AuthIssueResult> {
    let payload: SetupTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<SetupTokenPayload>(setupToken, {
        audience: SETUP_TOKEN_AUDIENCE,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired setup token');
    }
    if (payload.type !== 'setup') {
      throw new UnauthorizedException('Invalid setup token');
    }
    const user = await this.users.findById(payload.sub);
    if (user.passwordHash) {
      throw new ConflictException(
        'Password already set; use the password reset flow',
      );
    }
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await this.users.setPasswordHash(payload.sub, hash);
    const refreshed = await this.users.findById(payload.sub);
    await this.dispatchAuthEvent(refreshed, 'registration_welcome');
    this.logger.log(
      `Password set and user ${payload.sub} registered successfully`,
    );
    return this.issueAuthResult(refreshed);
  }

  async forgotPassword(identifier: string): Promise<{ ok: true }> {
    const user = await this.users.findByIdentifier(identifier);
    if (!user) {
      // Don't leak whether user exists, just return ok
      return { ok: true };
    }
    await this.otp.issue(identifier, user.displayName);
    return { ok: true };
  }

  async verifyResetOtp(
    identifier: string,
    code: string,
  ): Promise<{ resetToken: string }> {
    const user = await this.users.findByIdentifier(identifier);
    if (!user) throw new UnauthorizedException('Unknown identifier');
    await this.otp.verify(identifier, code);

    const payload: ResetTokenPayload = {
      sub: user.userId,
      type: 'reset',
      aud: RESET_TOKEN_AUDIENCE,
    };
    const resetToken = await this.jwt.signAsync(payload, {
      expiresIn: RESET_TOKEN_TTL_SECONDS,
    });
    return { resetToken };
  }

  async resetPassword(
    resetToken: string,
    newPassword: string,
  ): Promise<AuthIssueResult> {
    let payload: ResetTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<ResetTokenPayload>(resetToken, {
        audience: RESET_TOKEN_AUDIENCE,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired reset token');
    }
    if (payload.type !== 'reset') {
      throw new UnauthorizedException('Invalid reset token');
    }

    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.users.setPasswordHash(payload.sub, hash);

    const refreshed = await this.users.findById(payload.sub);
    await this.dispatchAuthEvent(refreshed, 'password_changed');

    this.logger.log(`Password reset for user ${payload.sub}`);
    return this.issueAuthResult(refreshed);
  }

  async changePassword(
    userId: string,
    newPassword: string,
  ): Promise<{ ok: true }> {
    const user = await this.users.findById(userId);
    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.users.setPasswordHash(userId, hash);

    // Emit event so other modules (like Vendors) can react
    this.eventEmitter.emit('user.password.changed', {
      userId,
      role: user.role.name,
    });

    this.logger.log(`Password changed for user ${userId}`);
    return { ok: true };
  }

  async login(identifier: string, password: string): Promise<AuthIssueResult> {
    const user = await this.users.findByIdentifier(identifier);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.otpVerified) {
      throw new UnauthorizedException('OTP not verified');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      this.logger.warn(`Failed login attempt for user ${user.userId}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.log(`User ${user.userId} logged in successfully`);
    return this.issueAuthResult(user);
  }

  async refresh(rawCookieToken: string): Promise<AuthIssueResult> {
    if (!rawCookieToken)
      throw new UnauthorizedException('Missing refresh token');
    const tokenHash = this.hashToken(rawCookieToken);
    const row = await this.refreshRepo.findOne({
      where: {
        tokenHash,
        revokedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
    });
    if (!row)
      throw new UnauthorizedException('Invalid or expired refresh token');
    row.revokedAt = new Date();
    await this.refreshRepo.save(row);
    const user = await this.users.findById(row.userId);
    return this.issueAuthResult(user);
  }

  async logout(rawCookieToken: string | undefined): Promise<{ ok: true }> {
    if (!rawCookieToken) return { ok: true };
    const tokenHash = this.hashToken(rawCookieToken);
    await this.refreshRepo.update(
      { tokenHash, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
    return { ok: true };
  }

  private async issueAuthResult(user: User): Promise<AuthIssueResult> {
    const permissions = await this.roles.listPermissions(user.roleId);
    const accessPayload: AccessTokenPayload = {
      sub: user.userId,
      role: user.role.name,
      permissions,
      type: 'access',
    };
    const accessTtl = this.config.getOrThrow<number>('app.jwt.accessTtl');
    const refreshTtl = this.config.getOrThrow<number>('app.jwt.refreshTtl');
    const accessToken = await this.jwt.signAsync(accessPayload, {
      expiresIn: accessTtl,
    });
    const rawRefresh = randomBytes(32).toString('hex');
    const refreshExpiresAt = new Date(Date.now() + refreshTtl * 1000);
    await this.refreshRepo.save(
      this.refreshRepo.create({
        userId: user.userId,
        tokenHash: this.hashToken(rawRefresh),
        expiresAt: refreshExpiresAt,
      }),
    );
    const publicUser: PublicUser = this.users.toPublic(user, permissions);

    let requiresPasswordChange = false;
    if (
      user.role.name === UserRole.VENDOR &&
      user.vendorProfile?.approvalStatus === VendorApprovalStatus.PENDING
    ) {
      requiresPasswordChange = true;
    }

    return {
      response: { accessToken, user: publicUser, requiresPasswordChange },
      refreshToken: rawRefresh,
      refreshExpiresAt,
    };
  }

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  private async dispatchAuthEvent(
    user: User,
    eventName: string,
    extras: Record<string, string> = {},
  ): Promise<void> {
    try {
      const content = await this.templateService.process(
        eventName,
        DEFAULT_AUTH_TEMPLATES,
        AUTH_NOTIFICATION_TEMPLATES_KEY,
        { userName: user.displayName, ...extras },
      );

      const target = this.notifications.resolveChannel(user);
      if (!target) return;

      if (target.channel === 'email') {
        await this.notifications.sendEmail(
          target.destination,
          content.subject,
          content.html,
        );
      } else {
        await this.notifications.sendSms(target.destination, content.smsText);
      }
    } catch (err) {
      this.logger.error(
        `Failed to dispatch auth event ${eventName}`,
        (err as Error).stack,
      );
    }
  }
}
