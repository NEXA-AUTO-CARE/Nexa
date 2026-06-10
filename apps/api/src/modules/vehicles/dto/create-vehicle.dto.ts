import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { VehicleType } from '@nexa/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVehicleDto {
  @ApiProperty({ example: 'AB12 CDE', maxLength: 15 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(15)
  registrationNumber: string;

  @ApiProperty({ example: 'BMW', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  make: string;

  @ApiProperty({ example: '3 Series', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  model: string;

  @ApiProperty({ enum: VehicleType, example: VehicleType.STANDARD })
  @IsEnum(VehicleType)
  vehicleType: VehicleType;

  @ApiPropertyOptional({ example: 'Black', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  colour?: string | null;
}
