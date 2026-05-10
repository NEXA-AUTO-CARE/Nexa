import { IsEnum } from 'class-validator';
import { BookingStatus } from '@nexa/shared';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBookingStatusDto {
  @ApiProperty({ enum: BookingStatus, example: BookingStatus.ACCEPTED })
  @IsEnum(BookingStatus)
  status: BookingStatus;
}
