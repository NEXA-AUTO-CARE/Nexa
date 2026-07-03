import { IsEnum } from 'class-validator';
import { PaymentStatus } from '@nexa/shared';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePaymentStatusDto {
  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.CAPTURED })
  @IsEnum(PaymentStatus)
  status: PaymentStatus;
}
