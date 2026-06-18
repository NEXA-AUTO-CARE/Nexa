import {
  Equals,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsArray,
} from 'class-validator';
import { ServiceType } from '@nexa/shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  @IsUUID()
  vehicleId: string;

  @ApiPropertyOptional({ enum: ServiceType, example: ServiceType.BASIC })
  @IsOptional()
  @IsEnum(ServiceType)
  serviceType?: ServiceType;

  @ApiProperty({ example: '2026-05-15T10:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  bookingTime: string;

  @ApiProperty({ example: '123 King Street, Aberdeen, AB24 5AA' })
  @IsString()
  @IsNotEmpty()
  serviceAddress: string;

  @ApiProperty({ example: '+447700900077' })
  @IsString()
  @IsNotEmpty()
  servicePhone: string;

  @ApiPropertyOptional({ example: 57.1497 })
  @IsOptional()
  @IsNumber()
  latitude?: number | null;

  @ApiPropertyOptional({ example: -2.0943 })
  @IsOptional()
  @IsNumber()
  longitude?: number | null;

  @ApiPropertyOptional({ example: ['a1b2c3d4-...'] })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  addonIds?: string[];

  @ApiProperty({
    example: true,
    description: 'Customer confirms a safe space to wash',
  })
  @IsBoolean()
  @Equals(true, { message: 'You must confirm you have a safe space to wash' })
  agreedSafeSpace: boolean;

  @ApiProperty({
    example: true,
    description: 'Customer confirms vehicle details are correct',
  })
  @IsBoolean()
  @Equals(true, { message: 'You must confirm all vehicle details are correct' })
  agreedDetailsCorrect: boolean;

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

export class RebookDto {
  @ApiPropertyOptional({ example: '2026-05-20T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  bookingTime?: string;
}

export class AssignVendorDto {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  @IsUUID()
  vendorId: string;
}
