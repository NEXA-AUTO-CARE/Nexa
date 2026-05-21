import { ApiProperty } from '@nestjs/swagger';
import { Permission, type PublicUser } from '@nexa/shared';

export class PublicUserDto implements PublicUser {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  userId: string;

  @ApiProperty({ example: 'Jane', nullable: true })
  firstName: string | null;

  @ApiProperty({ example: 'Doe', nullable: true })
  lastName: string | null;

  @ApiProperty({ example: 'jane@example.com', nullable: true })
  email: string | null;

  @ApiProperty({ example: '+447911123456', nullable: true })
  phoneNumber: string | null;

  @ApiProperty({ example: 'customer', description: 'Role machine name' })
  role: string;

  @ApiProperty({
    type: [String],
    example: ['users:read.self', 'users:write.self'],
    description: 'Effective permission codes for this role',
  })
  permissions: Permission[];

  @ApiProperty({ example: 'Jane Doe' })
  displayName: string;

  @ApiProperty({ example: true })
  otpVerified: boolean;

  @ApiProperty({ example: '2026-05-09T10:00:00.000Z', description: 'ISO 8601 timestamp' })
  createdAt: string;

  @ApiProperty({ example: 'acct_1032D82e319d', nullable: true, description: 'Stripe connected account ID' })
  stripeAccountId: string | null;
}
