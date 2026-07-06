import {
  Body,
  Controller,
  Headers,
  Post,
  Get,
  Req,
  UseGuards,
  Param,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { PaymentResponse } from '@nexa/shared';
import { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CreatePaymentIntentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';
import { AuditTrailService } from '../../common/audit/audit-trail.service';

@ApiTags('payments')
@ApiBearerAuth('jwt')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly auditTrail: AuditTrailService,
  ) {}

  @Post('intent')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a Stripe PaymentIntent for a booking' })
  @ApiCreatedResponse({
    description: 'PaymentIntent created with clientSecret',
  })
  async createIntent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePaymentIntentDto,
  ): Promise<PaymentResponse> {
    return this.payments.createPaymentIntent(user.userId, dto);
  }

  @Get('intent/:id/status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Sync and get the latest payment status for a payment intent' })
  @ApiOkResponse({ description: 'Latest payment status' })
  async getPaymentStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<PaymentResponse> {
    return this.payments.syncPaymentStatusByIntentId(id, user.userId);
  }

  @Post('bookings/:id/refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Admin: Refund a captured booking payment' })
  @ApiOkResponse({ description: 'Payment refunded' })
  async refund(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<PaymentResponse> {
    const p = await this.payments.refundBookingPayment(id);

    await this.auditTrail.record(
      'PAYMENT',
      id,
      'REFUND',
      { status: 'CAPTURED' },
      { status: p.status },
      user.userId,
    );

    return this.payments.toResponse(p);
  }

  @Post('bookings/:id/payout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Admin: Payout vendor for completed wash' })
  @ApiOkResponse({ description: 'Payout triggered' })
  async payout(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<PaymentResponse> {
    const p = await this.payments.payoutVendor(id);

    await this.auditTrail.record(
      'PAYMENT',
      id,
      'PAYOUT',
      null,
      { vendorPayout: p.vendorPayout, platformFee: p.platformFee },
      user.userId,
    );

    return this.payments.toResponse(p);
  }

  @Post('webhook')
  @Public()
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
