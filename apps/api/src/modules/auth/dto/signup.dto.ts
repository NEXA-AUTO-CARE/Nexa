import { type SignupDto as Shape, UserRole, type OtpChannel } from '@nexa/shared';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  ValidateIf,
} from 'class-validator';

const PHONE_RX = /^\+?[1-9]\d{6,14}$/;
const OTP_CHANNELS: OtpChannel[] = ['email', 'phone'];

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const trimOrNull = ({ value }: { value: unknown }) => {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return value;
  const t = value.trim();
  return t.length === 0 ? null : t;
};

export class SignupDto implements Shape {
  @ApiProperty({ example: 'Jane' })
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  lastName: string;

  @ApiProperty({
    example: 'jane@example.com',
    nullable: true,
    required: false,
    description: 'Email address (required if otpChannel is "email")',
  })
  @Transform(trimOrNull)
  @ValidateIf((_, value) => value !== null)
  @IsEmail()
  @Length(3, 255)
  email: string | null;

  @ApiProperty({
    example: '+447911123456',
    nullable: true,
    required: false,
    description: 'E.164 phone number (required if otpChannel is "phone")',
  })
  @Transform(trimOrNull)
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Length(7, 20)
  @Matches(PHONE_RX, { message: 'phoneNumber must be in E.164 format' })
  phoneNumber: string | null;

  @ApiProperty({ enum: UserRole, example: UserRole.CUSTOMER })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({
    enum: ['email', 'phone'],
    example: 'email',
    description: 'Channel to send the OTP code',
  })
  @IsIn(OTP_CHANNELS)
  otpChannel: OtpChannel;

  @ApiProperty({
    required: false,
    example: 'Jane Doe',
    description: 'Display name; defaults to firstName + lastName if omitted',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  displayName?: string;
}
