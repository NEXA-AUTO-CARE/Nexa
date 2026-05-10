import { type VerifyOtpDto as Shape } from '@nexa/shared';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class VerifyOtpDto implements Shape {
  @ApiProperty({
    example: 'jane@example.com',
    description: 'Email or phone number used at signup',
  })
  @IsString()
  @Length(3, 255)
  identifier: string;

  @ApiProperty({
    example: '123456',
    description: 'Six-digit OTP code sent to the contact',
  })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code: string;
}
