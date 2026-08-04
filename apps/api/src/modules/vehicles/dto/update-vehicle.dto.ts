import { IsOptional, IsString, MaxLength } from 'class-validator';
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

  @ApiPropertyOptional({ example: 'small_car' })
  @IsOptional()
  @IsString()
  vehicleType?: string;

  @ApiPropertyOptional({ example: 'Black', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  colour?: string | null;
}
