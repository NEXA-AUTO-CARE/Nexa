import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthResponse, OtpChannel, Permission, PublicUser, UserRole } from '@nexa/shared';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { RefreshToken, User } from '../../database/entities';
import { RolesService } from '../roles/roles.service';
import { UsersService, normalizeEmail, normalizePhone } from '../users/users.service';
import { OtpService } from './otp.service';

const BCRYPT_ROUNDS = 12;
const SETUP_TOKEN_TTL_SECONDS = 5 * 60;
const SETUP_TOKEN_AUDIENCE = 'nexa:set-password';

const SELF_SIGNUP_ROLES: ReadonlySet<string> = new Set([UserRole.CUSTOMER, UserRole.VENDOR]);

interface SetupTokenPayload {
  sub: string;
  type: 'setup';
  aud: typeof SETUP_TOKEN_AUDIENCE;
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
  constructor(
    private readonly users: UsersService,
    private readonly roles: RolesService,
    private readonly otp: OtpService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshRepo: Repository<RefreshToken>,
  ) {}

  async signup(args: SignupArgs): Promise<{ ok: true }> {
    if (!SELF_SIGNUP_ROLES.has(args.role)) {
      throw new BadRequestException('Only customer or vendor accounts can self-register');
    }

    const email = args.email ? normalizeEmail(args.email) : null;
    const phoneNumber = args.phoneNumber ? normalizePhone(args.phoneNumber) : null;

    if (!email && !phoneNumber) {
      throw new BadRequestException('Provide an email or a phone number');
    }
    if (args.otpChannel === 'email' && !email) {
      throw new BadRequestException('OTP channel "email" requires an email address');
    }
    if (args.otpChannel === 'phone' && !phoneNumber) {
      throw new BadRequestException('OTP channel "phone" requires a phone number');
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

    await this.otp.issue(otpTarget);
    return { ok: true };
  }

  async verifyOtp(identifier: string, code: string): Promise<{ setupToken: string }> {
    const user = await this.users.findByIdentifier(identifier);
    if (!user) throw new UnauthorizedException('Unknown identifier');
    await this.otp.verify(identifier, code);
    await this.users.markOtpVerified(user.userId);
    const payload: SetupTokenPayload = {
      sub: user.userId,
      type: 'setup',
      aud: SETUP_TOKEN_AUDIENCE,
    };
    const setupToken = await this.jwt.signAsync(payload, { expiresIn: SETUP_TOKEN_TTL_SECONDS });
    return { setupToken };
  }

  async setPassword(setupToken: string, password: string): Promise<AuthIssueResult> {
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
      throw new ConflictException('Password already set; use the password reset flow');
    }
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await this.users.setPasswordHash(payload.sub, hash);
    const refreshed = await this.users.findById(payload.sub);
    return this.issueAuthResult(refreshed);
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
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return this.issueAuthResult(user);
  }

  async refresh(rawCookieToken: string): Promise<AuthIssueResult> {
    if (!rawCookieToken) throw new UnauthorizedException('Missing refresh token');
    const tokenHash = this.hashToken(rawCookieToken);
    const row = await this.refreshRepo.findOne({
      where: { tokenHash, revokedAt: IsNull(), expiresAt: MoreThan(new Date()) },
    });
    if (!row) throw new UnauthorizedException('Invalid or expired refresh token');
    row.revokedAt = new Date();
    await this.refreshRepo.save(row);
    const user = await this.users.findById(row.userId);
    return this.issueAuthResult(user);
  }

  async logout(rawCookieToken: string | undefined): Promise<{ ok: true }> {
    if (!rawCookieToken) return { ok: true };
    const tokenHash = this.hashToken(rawCookieToken);
    await this.refreshRepo.update({ tokenHash, revokedAt: IsNull() }, { revokedAt: new Date() });
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
    const accessToken = await this.jwt.signAsync(accessPayload, { expiresIn: accessTtl });
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
    return {
      response: { accessToken, user: publicUser },
      refreshToken: rawRefresh,
      refreshExpiresAt,
    };
  }

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}
