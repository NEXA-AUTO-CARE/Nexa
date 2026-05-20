import { BadRequestException, Injectable, Logger } from '@nestjs/common';
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

function splitPayout(amount: string): { platformFee: string; vendorPayout: string } {
  const total = parseFloat(amount);
  const platformFee = Math.round(total * PLATFORM_FEE_RATE * 100) / 100;
  const vendorPayout = Math.round((total - platformFee) * 100) / 100;
  return { platformFee: platformFee.toFixed(2), vendorPayout: vendorPayout.toFixed(2) };
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
    const stripeKey = this.config.get<string>('app.stripe.secret') || 'sk_test_replace_me';
    this.stripe = new Stripe(stripeKey);
  }

  async createPaymentIntent(userId: string, dto: CreatePaymentIntentDto): Promise<PaymentResponse> {
    // 1. Verify booking exists and belongs to user
    const booking = await this.bookingsService.verifyMyBooking(dto.bookingId, userId);

    if (booking.status === BookingStatus.COMPLETED || booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking cannot be paid for in its current status');
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
      const intent = await this.stripe.paymentIntents.retrieve(payment.stripePaymentIntentId);
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
        payment = this.paymentRepo.create({
          bookingId: booking.bookingId,
          stripePaymentIntentId: paymentIntent.id,
          amount: booking.price,
          platformFee: split.platformFee,
          vendorPayout: split.vendorPayout,
          status: PaymentStatus.PENDING,
        });

        await this.paymentRepo.save(payment);
      } catch (err) {
        this.logger.error('Failed to create Stripe PaymentIntent', err);
        // Fallback for dev mode if stripe isn't configured properly
        if (err.message?.includes('Invalid API Key') || !this.config.get('app.stripe.secret') || this.config.get('app.stripe.secret') === 'sk_test_replace_me') {
          this.logger.warn('Mocking payment intent for development');
          const split = splitPayout(booking.price);
          payment = this.paymentRepo.create({
            bookingId: booking.bookingId,
            stripePaymentIntentId: 'pi_mock_' + Date.now(),
            amount: booking.price,
            platformFee: split.platformFee,
            vendorPayout: split.vendorPayout,
            status: PaymentStatus.PENDING,
          });
          await this.paymentRepo.save(payment);
          clientSecret = 'pi_mock_secret';
        } else {
          throw new BadRequestException('Payment gateway error');
        }
      }
    }

    return this.toResponse(payment, clientSecret ?? undefined);
  }

  async handleStripeWebhook(signature: string, payload: Buffer): Promise<void> {
    const webhookSecret = this.config.get<string>('app.stripe.webhookSecret');
    if (!webhookSecret) {
      this.logger.warn('Stripe webhook secret not configured. Skipping webhook verification.');
      return;
    }

    let event: any;

    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err: any) {
      this.logger.error(`Webhook Error: ${err.message}`);
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as any;
      
      const payment = await this.paymentRepo.findOne({
        where: { stripePaymentIntentId: paymentIntent.id },
      });

      if (payment && payment.status !== PaymentStatus.CAPTURED) {
        payment.status = PaymentStatus.CAPTURED;
        await this.paymentRepo.save(payment);
        
        // Let BookingsService know payment is complete
        this.logger.log(`Payment captured for booking ${payment.bookingId}`);
        // Can optionally update booking status or emit an event
      }
    }
  }

  toResponse(payment: Payment, clientSecret?: string): PaymentResponse {
    return {
      paymentId: payment.paymentId,
      bookingId: payment.bookingId,
      status: payment.status,
      amount: payment.amount,
      clientSecret: clientSecret || undefined,
    };
  }
}
