import { Body, Controller, Headers, Post, Req, UseGuards, Param } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PaymentResponse } from '@nexa/shared';
import { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreatePaymentIntentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@ApiBearerAuth('jwt')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('intent')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a Stripe PaymentIntent for a booking' })
  @ApiCreatedResponse({ description: 'PaymentIntent created with clientSecret' })
  async createIntent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePaymentIntentDto,
  ): Promise<PaymentResponse> {
    return this.payments.createPaymentIntent(user.userId, dto);
  }

  @Post('bookings/:id/refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Admin: Refund a captured booking payment' })
  @ApiOkResponse({ description: 'Payment refunded' })
  async refund(@Param('id') id: string): Promise<PaymentResponse> {
    const p = await this.payments.refundBookingPayment(id);
    return this.payments.toResponse(p);
  }

  @Post('bookings/:id/payout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Admin: Payout vendor for completed wash' })
  @ApiOkResponse({ description: 'Payout triggered' })
  async payout(@Param('id') id: string): Promise<PaymentResponse> {
    const p = await this.payments.payoutVendor(id);
    return this.payments.toResponse(p);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: RawBodyRequest<Request>,
  ) {
    if (!signature || !request.rawBody) {
      return { received: false };
    }
    await this.payments.handleStripeWebhook(signature, request.rawBody);
    return { received: true };
  }
}

