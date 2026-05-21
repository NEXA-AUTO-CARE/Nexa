import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { VehicleType } from '@nexa/shared';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateVehicleDto {
  @ApiPropertyOptional({ example: 'AB12 CDE', maxLength: 15 })
  @IsOptional()
  @IsString()
  @MaxLength(15)
  registrationNumber?: string;

  @ApiPropertyOptional({ example: 'BMW', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  make?: string;

  @ApiPropertyOptional({ example: '3 Series', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  model?: string;

  @ApiPropertyOptional({ enum: VehicleType, example: VehicleType.STANDARD })
  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @ApiPropertyOptional({ example: 'Black', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  colour?: string | null;
}
