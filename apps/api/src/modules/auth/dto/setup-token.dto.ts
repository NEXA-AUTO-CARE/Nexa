import { ApiProperty } from '@nestjs/swagger';

export class SetupTokenDto {
  @ApiProperty({
    description: 'Short-lived JWT for the set-password step (valid 5 minutes)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  setupToken: string;
}
