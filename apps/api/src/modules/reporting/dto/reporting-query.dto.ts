import { ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus, PaymentStatus, ServiceType } from '@nexa/shared';
import type { ReportDateField, ReportGroupBy } from '@nexa/shared';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ReportingQueryDto {
  @ApiPropertyOptional({
    description: 'Inclusive start date (YYYY-MM-DD or ISO 8601 timestamp)',
    example: '2026-10-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Inclusive end date (YYYY-MM-DD or ISO 8601 timestamp)',
    example: '2026-11-18',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    enum: ['day', 'week', 'month'],
    default: 'day',
    description: 'Time-series aggregation granularity',
  })
  @IsOptional()
  @IsIn(['day', 'week', 'month'])
  groupBy?: ReportGroupBy;

  @ApiPropertyOptional({
    enum: ['bookingTime', 'createdOn'],
    default: 'bookingTime',
    description:
      'Booking date field used for date-range filtering and trend grouping',
  })
  @IsOptional()
  @IsIn(['bookingTime', 'createdOn'])
  dateField?: ReportDateField;

  @ApiPropertyOptional({ enum: BookingStatus })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({ enum: ServiceType })
  @IsOptional()
  @IsEnum(ServiceType)
  serviceType?: ServiceType;

  @ApiPropertyOptional({ description: 'Filter by assigned vendor user ID' })
  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @ApiPropertyOptional({ description: 'Filter by postcode prefix (e.g. AB10)' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postcode?: string;

  @ApiPropertyOptional({
    description: 'Search by booking ref, customer, vehicle reg, or address',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 25, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @ApiPropertyOptional({
    description:
      'Comma-separated list of booking CSV column keys to include when exporting',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  columns?: string;
}
