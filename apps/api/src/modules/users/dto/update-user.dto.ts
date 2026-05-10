import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({
    required: false,
    example: 'Jane Doe',
    description: 'Display name shown in the UI (1–100 chars)',
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  displayName?: string;
}
