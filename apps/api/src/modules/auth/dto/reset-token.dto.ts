import { ApiProperty } from '@nestjs/swagger';

export class ResetTokenDto {
  @ApiProperty({
    description: 'Short-lived token required to reset the password',
  })
  resetToken: string;
}
