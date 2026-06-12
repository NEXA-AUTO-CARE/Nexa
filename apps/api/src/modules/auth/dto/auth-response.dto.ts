import { ApiProperty } from '@nestjs/swagger';
import { type AuthResponse } from '@nexa/shared';
import { PublicUserDto } from '../../users/dto/public-user.dto';

export class AuthResponseDto implements AuthResponse {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ type: PublicUserDto })
  user: PublicUserDto;

  @ApiProperty({ required: false })
  requiresPasswordChange?: boolean;
}
