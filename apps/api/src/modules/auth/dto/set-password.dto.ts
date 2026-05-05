import { type SetPasswordDto as Shape } from '@nexa/shared';
import { IsString, Length, MinLength } from 'class-validator';

export class SetPasswordDto implements Shape {
  @IsString()
  @Length(20, 4096)
  setupToken: string;

  @IsString()
  @MinLength(8)
  password: string;
}
