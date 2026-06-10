import {
  IsBoolean,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';
import type {
  CreateAddonDto as ICreateAddonDto,
  UpdateAddonDto as IUpdateAddonDto,
} from '@nexa/shared';

export class CreateAddonDto implements ICreateAddonDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumberString()
  price: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateAddonDto implements IUpdateAddonDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumberString()
  @IsOptional()
  price?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
