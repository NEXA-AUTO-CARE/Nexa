import { type VerifyOtpDto as Shape } from '@nexa/shared';
import { IsString, Length, Matches } from 'class-validator';

export class VerifyOtpDto implements Shape {
  @IsString()
  @Length(3, 255)
  identifier: string;

  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code: string;
}
