import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateRoleDto {
  @ApiProperty({ required: false, example: 'support_lead' })
  @IsOptional()
  @IsString()
  @Length(2, 64)
  name?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string | null;
}
