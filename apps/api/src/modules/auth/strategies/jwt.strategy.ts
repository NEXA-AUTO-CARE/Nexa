import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Permission } from '@nexa/shared';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';

export interface JwtAccessPayload {
  sub: string;
  role: string;
  permissions: Permission[];
  type: 'access';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('app.jwt.accessSecret'),
    });
  }

  validate(payload: JwtAccessPayload): AuthenticatedUser {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }
    return {
      userId: payload.sub,
      role: payload.role,
      permissions: payload.permissions ?? [],
    };
  }
}
