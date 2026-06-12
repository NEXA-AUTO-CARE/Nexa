import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'newStrongPassword123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(12)
  newPassword: string;
}
