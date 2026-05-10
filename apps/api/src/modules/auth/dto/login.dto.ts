import { type LoginDto as Shape } from '@nexa/shared';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class LoginDto implements Shape {
  @ApiProperty({
    example: 'jane@example.com',
    description: 'Email address or E.164 phone number',
  })
  @IsString()
  @Length(3, 255)
  identifier: string;

  @ApiProperty({
    example: 'P@ssword1!',
    description: 'Account password (8–1024 chars)',
  })
  @IsString()
  @Length(8, 1024)
  password: string;
}
