import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthResponse, PublicUser, UserRole } from '@nexa/shared';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { RefreshToken, User } from '../../database/entities';
import { UsersService, parseIdentifier } from '../users/users.service';
import { OtpService } from './otp.service';

const BCRYPT_ROUNDS = 12;
const SETUP_TOKEN_TTL_SECONDS = 5 * 60;

interface SetupTokenPayload {
  sub: string;
  type: 'setup';
}

interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  type: 'access';
}

export interface AuthIssueResult {
  response: AuthResponse;
  refreshToken: string;
  refreshExpiresAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly otp: OtpService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshRepo: Repository<RefreshToken>,
  ) {}

  async signup(args: { identifier: string; role: UserRole; displayName: string }): Promise<{ ok: true }> {
    try {
      parseIdentifier(args.identifier);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
    if (args.role === UserRole.ADMIN) {
      throw new BadRequestException('Admins cannot be self-created');
    }
    const user = await this.users.createOtpPending(args);
    if (user.passwordHash) {
      throw new ConflictException('Account already exists; please log in instead');
    }
    await this.otp.issue(args.identifier);
    return { ok: true };
  }

  async verifyOtp(identifier: string, code: string): Promise<{ setupToken: string }> {
    const user = await this.users.findByIdentifier(identifier);
    if (!user) throw new UnauthorizedException('Unknown identifier');
    await this.otp.verify(identifier, code);
    await this.users.markOtpVerified(user.userId);
    const payload: SetupTokenPayload = { sub: user.userId, type: 'setup' };
    const setupToken = await this.jwt.signAsync(payload, { expiresIn: SETUP_TOKEN_TTL_SECONDS });
    return { setupToken };
  }

  async setPassword(setupToken: string, password: string): Promise<AuthIssueResult> {
    let payload: SetupTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<SetupTokenPayload>(setupToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired setup token');
    }
    if (payload.type !== 'setup') {
      throw new UnauthorizedException('Invalid setup token');
    }
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await this.users.setPasswordHash(payload.sub, hash);
    const user = await this.users.findById(payload.sub);
    return this.issueAuthResult(user);
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
    const accessPayload: AccessTokenPayload = {
      sub: user.userId,
      role: user.role,
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
    const publicUser: PublicUser = this.users.toPublic(user);
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
