import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsString } from 'class-validator';

export class SetPermissionsDto {
  @ApiProperty({
    description:
      'Replace the role’s permission set. Each value must be a known Permission code.',
    type: [String],
    example: ['users:read.all', 'roles:read'],
  })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissions: string[];
}
