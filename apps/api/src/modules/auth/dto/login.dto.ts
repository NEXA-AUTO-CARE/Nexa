import { type LoginDto as Shape } from '@nexa/shared';
import { IsString, Length } from 'class-validator';

export class LoginDto implements Shape {
  @IsString()
  @Length(3, 255)
  identifier: string;

  @IsString()
  @Length(8, 1024)
  password: string;
}
