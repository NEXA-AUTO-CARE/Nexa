import { type SetPasswordDto as Shape } from '@nexa/shared';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

const STRONG_PASSWORD_RX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

export class SetPasswordDto implements Shape {
  @ApiProperty({
    description:
      'Short-lived token returned by /auth/verify-otp (valid 5 minutes)',
  })
  @IsString()
  @Length(20, 4096)
  setupToken: string;

  @ApiProperty({
    example: 'P@ssword1!',
    description:
      '8–128 chars; must contain at least one uppercase letter, one lowercase letter, one digit, and one symbol',
  })
  @IsString()
  @Length(8, 128)
  @Matches(STRONG_PASSWORD_RX, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one digit, and one symbol',
  })
  password: string;
}
