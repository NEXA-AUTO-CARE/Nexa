import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCustomerBookingDto {
  @ApiPropertyOptional({ example: '2026-05-20T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  bookingTime?: string;

  @ApiPropertyOptional({ example: '123 King Street, Aberdeen, AB24 5AA' })
  @IsOptional()
  @IsString()
  serviceAddress?: string;

  @ApiPropertyOptional({ example: '+447700900077' })
  @IsOptional()
  @IsString()
  servicePhone?: string;

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

export class AdminUpdateBookingDto extends UpdateCustomerBookingDto {
  @ApiPropertyOptional({ example: ['a1b2c3d4-...'] })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  addonIds?: string[];
}
