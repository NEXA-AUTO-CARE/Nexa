import { ApiProperty } from '@nestjs/swagger';
import { RoleDto } from './role.dto';

export class RoleWithPermissionsDto extends RoleDto {
  @ApiProperty({
    type: [String],
    example: ['users:read.all', 'roles:read'],
    description: 'Permission codes assigned to this role',
  })
  permissions: string[];
}
