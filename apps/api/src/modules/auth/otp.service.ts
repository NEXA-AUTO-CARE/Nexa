import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomInt } from 'node:crypto';
import { IsNull, LessThan, Repository } from 'typeorm';
import { OtpCode } from '../../database/entities';

const OTP_TTL_MINUTES = 10;

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    @InjectRepository(OtpCode) private readonly otpRepo: Repository<OtpCode>,
    private readonly config: ConfigService,
  ) {}

  async issue(identifier: string): Promise<string> {
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);
    await this.otpRepo.save(this.otpRepo.create({ identifier, code, expiresAt }));

    if (this.config.get<boolean>('app.flags.otpDevLog', true)) {
      this.logger.log(`[OTP] ${identifier} -> ${code} (expires ${expiresAt.toISOString()})`);
    }
    return code;
  }

  async verify(identifier: string, code: string): Promise<void> {
    const row = await this.otpRepo.findOne({
      where: { identifier, code, consumedAt: IsNull() },
      order: { createdOn: 'DESC' },
    });
    if (!row) {
      throw new UnauthorizedException('Invalid or already-used OTP');
    }
    if (row.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('OTP expired');
    }
    row.consumedAt = new Date();
    await this.otpRepo.save(row);
  }

  async purgeExpired(): Promise<number> {
    const result = await this.otpRepo.delete({ expiresAt: LessThan(new Date()) });
    return result.affected ?? 0;
  }
}
