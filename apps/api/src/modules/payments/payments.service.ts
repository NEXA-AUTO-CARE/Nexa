import * as crypto from 'crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { BookingStatus, PaymentStatus } from '@nexa/shared';
import type { PaymentResponse } from '@nexa/shared';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { Payment } from '../../database/entities';
import { BookingsService } from '../bookings/bookings.service';
import { CreatePaymentIntentDto } from './dto/create-payment.dto';

/**
 * Platform commission applied to every booking. The vendor receives the
 * remainder. Keep as a single source of truth — pricing tweaks happen here.
 */
const PLATFORM_FEE_RATE = 0.15;

function splitPayout(amount: string): {
  platformFee: string;
  vendorPayout: string;
} {
  const total = parseFloat(amount);
  const platformFee = Math.round(total * PLATFORM_FEE_RATE * 100) / 100;
  const vendorPayout = Math.round((total - platformFee) * 100) / 100;
  return {
    platformFee: platformFee.toFixed(2),
    vendorPayout: vendorPayout.toFixed(2),
  };
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly stripe;

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly bookingsService: BookingsService,
    private readonly config: ConfigService,
  ) {
    const stripeKey =
      this.config.get<string>('app.stripe.secret') || 'sk_test_replace_me';
    this.stripe = new Stripe(stripeKey);
  }

  async createPaymentIntent(
    userId: string,
    dto: CreatePaymentIntentDto,
  ): Promise<PaymentResponse> {
    // 1. Verify booking exists and belongs to user
    const booking = await this.bookingsService.verifyMyBooking(
      dto.bookingId,
      userId,
    );

    if (
      booking.status === BookingStatus.COMPLETED ||
      booking.status === BookingStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Booking cannot be paid for in its current status',
      );
    }

    // 2. Check if a pending payment already exists for this booking
    let payment = await this.paymentRepo.findOne({
      where: { bookingId: dto.bookingId },
    });

    const amountInCents = Math.round(parseFloat(booking.price) * 100);

    let clientSecret: string | null = null;

    if (payment && payment.status === PaymentStatus.CAPTURED) {
      throw new BadRequestException('Booking is already paid');
    }

    if (payment && payment.stripePaymentIntentId) {
      // Update existing payment intent if amount changed (unlikely but good practice)
      const intent = await this.stripe.paymentIntents.retrieve(
        payment.stripePaymentIntentId,
      );
      clientSecret = intent.client_secret;

      if (intent.amount !== amountInCents) {
        await this.stripe.paymentIntents.update(payment.stripePaymentIntentId, {
          amount: amountInCents,
        });
      }
    } else {
      // 3. Create a new Stripe PaymentIntent
      try {
        const paymentIntent = await this.stripe.paymentIntents.create({
          amount: amountInCents,
          currency: 'gbp',
          metadata: {
            bookingId: booking.bookingId,
            userId: userId,
          },
          automatic_payment_methods: {
            enabled: true,
          },
        });

        clientSecret = paymentIntent.client_secret;

        // 4. Save Payment record to database
        const split = splitPayout(booking.price);
        const transactionReference = 'TXN-' + crypto.randomBytes(4).toString('hex').toUpperCase();

        payment = this.paymentRepo.create({
          bookingId: booking.bookingId,
          stripePaymentIntentId: paymentIntent.id,
          transactionReference,
          amount: booking.price,
          platformFee: split.platformFee,
          vendorPayout: split.vendorPayout,
          status: PaymentStatus.PENDING,
        });

        await this.paymentRepo.save(payment);
        this.logger.log(
          `Created Stripe PaymentIntent ${paymentIntent.id} for booking ${booking.bookingId}`,
        );
      } catch (err) {
        this.logger.error('Failed to create Stripe PaymentIntent', err);
        // Fallback for dev mode if stripe isn't configured properly
        if (
          err.message?.includes('Invalid API Key') ||
          !this.config.get('app.stripe.secret') ||
          this.config.get('app.stripe.secret') === 'sk_test_replace_me'
        ) {
          this.logger.warn('Mocking payment intent for development');
          const split = splitPayout(booking.price);
          const transactionReference = 'TXN-' + crypto.randomBytes(4).toString('hex').toUpperCase();

          payment = this.paymentRepo.create({
            bookingId: booking.bookingId,
            stripePaymentIntentId: 'pi_mock_' + Date.now(),
            transactionReference,
            amount: booking.price,
            platformFee: split.platformFee,
            vendorPayout: split.vendorPayout,
            status: PaymentStatus.PENDING,
          });
          await this.paymentRepo.save(payment);
          clientSecret = 'pi_mock_secret';
          this.logger.log(
            `Created Mock PaymentIntent for booking ${booking.bookingId}`,
          );
        } else {
          throw new BadRequestException('Payment gateway error');
        }
      }
    }

    return this.toResponse(payment, clientSecret ?? undefined);
  }

  async syncPaymentStatusByIntentId(paymentIntentId: string, userId: string, userRole?: string): Promise<PaymentResponse> {
    const payment = await this.paymentRepo.findOne({
      where: { stripePaymentIntentId: paymentIntentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }

    // Verify booking ownership if the user is not an admin
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      await this.bookingsService.verifyMyBooking(payment.bookingId, userId);
    }

    if (!payment.stripePaymentIntentId.startsWith('pi_mock_')) {
      try {
        const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
        let newStatus = payment.status;

        if (intent.status === 'succeeded') {
          newStatus = PaymentStatus.CAPTURED;
        } else if (intent.status === 'processing') {
          newStatus = PaymentStatus.PROCESSING;
        } else if (intent.status === 'requires_payment_method' || intent.status === 'requires_action') {
          newStatus = PaymentStatus.PENDING;
        } else if (intent.status === 'canceled') {
          newStatus = PaymentStatus.FAILED;
        }

        if (payment.status !== newStatus) {
           payment.status = newStatus;
           await this.paymentRepo.save(payment);
           this.logger.log(`Payment status synced to ${newStatus} for intent ${paymentIntentId}`);
           await this.bookingsService.updatePaymentStatus(payment.bookingId, newStatus);
        }
      } catch (e) {
        this.logger.error(`Failed to retrieve payment intent ${paymentIntentId} from Stripe`, e);
      }
    }

    return this.toResponse(payment);
  }

  async syncPaymentStatusByBookingId(bookingId: string): Promise<PaymentResponse> {
    const payment = await this.paymentRepo.findOne({ where: { bookingId } });
    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }
    // We pass 'admin' role to bypass the ownership check
    return this.syncPaymentStatusByIntentId(payment.stripePaymentIntentId, 'system', 'admin');
  }

  async handleStripeWebhook(signature: string, payload: Buffer): Promise<void> {
    const webhookSecret = this.config.get<string>('app.stripe.webhookSecret');
    if (!webhookSecret) {
      this.logger.warn(
        'Stripe webhook secret not configured. Skipping webhook verification.',
      );
      return;
    }

    let event: any;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );
    } catch (err: any) {
      this.logger.error(`Webhook Error: ${err.message}`);
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    const successEvents = [
      'checkout.session.async_payment_succeeded',
      'checkout.session.completed',
      'invoice.paid',
      'invoice.payment_succeeded',
      'payment_intent.succeeded',
    ];

    const failedEvents = [
      'checkout.session.async_payment_failed',
      'checkout.session.expired',
      'invoice.marked_uncollectible',
      'invoice.payment_failed',
      'payment_intent.payment_failed',
    ];

    const processingEvents = [
      'payment_intent.processing',
    ];

    const obj = event.data.object;
    let paymentIntentId = null;

    if (event.type.startsWith('payment_intent.')) {
      paymentIntentId = obj.id;
    } else {
      paymentIntentId = typeof obj.payment_intent === 'string' ? obj.payment_intent : obj.payment_intent?.id;
    }

    if (!paymentIntentId) {
      this.logger.debug(`No payment intent ID found for event ${event.type}`);
      return;
    }

    const payment = await this.paymentRepo.findOne({
      where: { stripePaymentIntentId: paymentIntentId },
    });

    if (payment) {
      let newStatus = payment.status;

      if (successEvents.includes(event.type)) {
        newStatus = PaymentStatus.CAPTURED;
      } else if (failedEvents.includes(event.type)) {
        newStatus = PaymentStatus.FAILED;
      } else if (processingEvents.includes(event.type)) {
        newStatus = PaymentStatus.PROCESSING;
      } else if (event.type.startsWith('refund.')) {
        if (obj.status === 'succeeded') {
          newStatus = PaymentStatus.REFUNDED;
        } else if (obj.status === 'failed') {
          newStatus = PaymentStatus.CAPTURED;
        }
      }

      if (payment.status !== newStatus) {
         payment.status = newStatus;
         await this.paymentRepo.save(payment);
         this.logger.log(`Payment status updated to ${newStatus} for booking ${payment.bookingId}`);
         await this.bookingsService.updatePaymentStatus(payment.bookingId, newStatus);
      }
    }
  }

  async refundBookingPayment(bookingId: string): Promise<Payment> {
    const payment = await this.paymentRepo.findOne({ where: { bookingId } });
    if (!payment) throw new NotFoundException('Payment record not found');
    if (payment.status !== PaymentStatus.CAPTURED) {
      throw new BadRequestException('Only captured payments can be refunded');
    }

    try {
      if (!payment.stripePaymentIntentId.startsWith('pi_mock_')) {
        await this.stripe.refunds.create({
          payment_intent: payment.stripePaymentIntentId,
        });
      }
    } catch (e) {
      this.logger.error('Failed to trigger Stripe refund', e);
    }

    payment.status = PaymentStatus.REFUNDED;
    await this.paymentRepo.save(payment);
    this.logger.log(`Refunded payment for booking ${bookingId}`);

    // Also update booking status to cancelled
    try {
      const booking = await this.bookingsService.findById(bookingId);
      if (booking) {
        await this.bookingsService.updateStatus(
          bookingId,
          booking.userId,
          BookingStatus.CANCELLED,
        );
      }
    } catch (e) {
      this.logger.error(
        'Failed to automatically transition booking to CANCELLED on refund',
        e,
      );
    }

    return payment;
  }

  async payoutVendor(bookingId: string): Promise<Payment> {
    const payment = await this.paymentRepo.findOne({ where: { bookingId } });
    if (!payment) throw new NotFoundException('Payment record not found');
    if (payment.status !== PaymentStatus.CAPTURED) {
      throw new BadRequestException(
        'Payment must be captured before paying out',
      );
    }

    const booking = await this.bookingsService.findByIdWithRelations(bookingId);
    if (!booking.vendorId) {
      throw new BadRequestException('No vendor is assigned to this booking');
    }

    const vendor = booking.vendor;
    if (!vendor || !vendor.stripeAccountId) {
      throw new BadRequestException(
        'Vendor does not have a Stripe Connect account connected',
      );
    }

    try {
      if (!payment.stripePaymentIntentId.startsWith('pi_mock_')) {
        const amountInCents = Math.round(
          parseFloat(payment.vendorPayout) * 100,
        );
        await this.stripe.transfers.create({
          amount: amountInCents,
          currency: 'gbp',
          destination: vendor.stripeAccountId,
          description: `Payout for booking ${bookingId}`,
        });
        this.logger.log(
          `Triggered payout of ${amountInCents} to vendor ${vendor.stripeAccountId} for booking ${bookingId}`,
        );
      }
    } catch (e) {
      this.logger.error('Failed to trigger Stripe transfer/payout', e);
    }

    return payment;
  }

  toResponse(payment: Payment, clientSecret?: string): PaymentResponse {
    return {
      paymentId: payment.paymentId,
      bookingId: payment.bookingId,
      transactionReference: payment.transactionReference,
      status: payment.status,
      amount: payment.amount,
      clientSecret: clientSecret || undefined,
    };
  }
}
