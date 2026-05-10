import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { ServiceType } from '@nexa/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  @IsUUID()
  vehicleId: string;

  @ApiProperty({ enum: ServiceType, example: ServiceType.BASIC })
  @IsEnum(ServiceType)
  serviceType: ServiceType;

  @ApiProperty({ example: '2026-05-15T10:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  bookingTime: string;

  @ApiProperty({ example: '123 King Street, Aberdeen, AB24 5AA' })
  @IsString()
  @IsNotEmpty()
  serviceAddress: string;

  @ApiPropertyOptional({ example: 57.1497 })
  @IsOptional()
  @IsNumber()
  latitude?: number | null;

  @ApiPropertyOptional({ example: -2.0943 })
  @IsOptional()
  @IsNumber()
  longitude?: number | null;
}
