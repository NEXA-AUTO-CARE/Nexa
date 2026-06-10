import { ApiProperty } from '@nestjs/swagger';

export class RoleDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  roleId: string;

  @ApiProperty({
    example: 'support_agent',
    description: 'Lowercase machine name',
  })
  name: string;

  @ApiProperty({ example: 'Tier-1 customer support', nullable: true })
  description: string | null;

  @ApiProperty({
    example: false,
    description: 'System roles cannot be renamed or deleted',
  })
  isSystem: boolean;

  @ApiProperty({ example: '2026-05-09T10:00:00.000Z' })
  createdOn: Date;

  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    nullable: true,
  })
  createdBy: string | null;
}
