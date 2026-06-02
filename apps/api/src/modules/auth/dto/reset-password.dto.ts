import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1...', description: 'Reset token received after OTP verification' })
  @IsString()
  @IsNotEmpty()
  resetToken: string;

  @ApiProperty({ example: 'NewSecret123!', description: 'The new password to set' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;
}
