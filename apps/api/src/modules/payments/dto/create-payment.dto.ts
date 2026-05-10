import { IsUUID } from 'class-validator';
import type { CreatePaymentIntentDto as ICreatePaymentIntentDto } from '@nexa/shared';

export class CreatePaymentIntentDto implements ICreatePaymentIntentDto {
  @IsUUID()
  bookingId: string;
}
