import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
  IsNumber,
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

  @ApiProperty({ example: '+447911123456' })
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsPhoneNumber('GB', { message: 'Must be a valid UK phone number' })
  @MaxLength(20)
  phoneNumber: string;

  @ApiPropertyOptional({ example: 'Nexa Car Detailers Ltd' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyName?: string;

  @ApiPropertyOptional({ example: 57.1497 })
  @IsOptional()
  @IsNumber()
  latitude?: number | null;

  @ApiPropertyOptional({ example: -2.0943 })
  @IsOptional()
  @IsNumber()
  longitude?: number | null;

  @ApiPropertyOptional({ example: 'Flat 1' })
  @IsOptional()
  @IsString()
  addressLine1?: string | null;

  @ApiPropertyOptional({ example: '15 Union Street' })
  @IsOptional()
  @IsString()
  addressLine2?: string | null;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  addressLine3?: string | null;

  @ApiPropertyOptional({ example: 'ABERDEEN' })
  @IsOptional()
  @IsString()
  postTown?: string | null;

  @ApiPropertyOptional({ example: 'AB10 1AB' })
  @IsOptional()
  @IsString()
  postcode?: string | null;

  @ApiPropertyOptional({ example: '123456789' })
  @IsOptional()
  @IsString()
  uprn?: string | null;
}

export class UpdateVendorDto {
  @ApiPropertyOptional({ example: 'Nexa Car Detailers Ltd' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyName?: string;

  @ApiPropertyOptional({
    example: 'ACTIVE',
    enum: ['PENDING', 'ACTIVE', 'SUSPENDED'],
  })
  @IsOptional()
  @IsString()
  approvalStatus?: 'PENDING' | 'ACTIVE' | 'SUSPENDED';

  @ApiPropertyOptional({ example: 57.1497 })
  @IsOptional()
  @IsNumber()
  latitude?: number | null;

  @ApiPropertyOptional({ example: -2.0943 })
  @IsOptional()
  @IsNumber()
  longitude?: number | null;

  @ApiPropertyOptional({ example: 'Flat 1' })
  @IsOptional()
  @IsString()
  addressLine1?: string | null;

  @ApiPropertyOptional({ example: '15 Union Street' })
  @IsOptional()
  @IsString()
  addressLine2?: string | null;

  @ApiPropertyOptional({ example: '' })
  @IsOptional()
  @IsString()
  addressLine3?: string | null;

  @ApiPropertyOptional({ example: 'ABERDEEN' })
  @IsOptional()
  @IsString()
  postTown?: string | null;

  @ApiPropertyOptional({ example: 'AB10 1AB' })
  @IsOptional()
  @IsString()
  postcode?: string | null;

  @ApiPropertyOptional({ example: '123456789' })
  @IsOptional()
  @IsString()
  uprn?: string | null;
}
