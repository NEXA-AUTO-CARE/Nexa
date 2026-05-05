import { UserRole, type SignupDto as Shape } from '@nexa/shared';
import { IsEnum, IsString, Length } from 'class-validator';

export class SignupDto implements Shape {
  @IsString()
  @Length(3, 255)
  identifier: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsString()
  @Length(1, 100)
  displayName: string;
}
