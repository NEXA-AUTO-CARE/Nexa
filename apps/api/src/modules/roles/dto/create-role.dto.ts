import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({
    example: 'support_agent',
    description: 'Lowercase machine name (letters, digits, underscores)',
  })
  @IsString()
  @Length(2, 64)
  name: string;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 'Tier-1 customer support',
  })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;
}
