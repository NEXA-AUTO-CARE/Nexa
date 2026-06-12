import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateVendorDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email: string;

  @ApiPropertyOptional({ example: '+447911123456' })
  @IsOptional()
  @IsPhoneNumber()
  @MaxLength(20)
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'Nexa Car Detailers Ltd' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyName?: string;
}

export class UpdateVendorDto {
  @ApiPropertyOptional({ example: 'Nexa Car Detailers Ltd' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyName?: string;

  @ApiPropertyOptional({ example: 'ACTIVE', enum: ['PENDING', 'ACTIVE', 'SUSPENDED'] })
  @IsOptional()
  @IsString()
  approvalStatus?: 'PENDING' | 'ACTIVE' | 'SUSPENDED';
}
