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
import { In, Repository } from 'typeorm';
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
    const rawIds =
      dto.bookingIds && dto.bookingIds.length > 0
        ? dto.bookingIds
        : dto.bookingId
          ? [dto.bookingId]
          : [];
    const targetBookingIds = Array.from(new Set(rawIds));

    if (targetBookingIds.length === 0) {
      throw new BadRequestException('At least one bookingId is required');
    }

    // 1. Verify all bookings exist and belong to user
    const bookings = await Promise.all(
      targetBookingIds.map((id) =>
        this.bookingsService.verifyMyBooking(id, userId),
      ),
    );

    for (const booking of bookings) {
      if (
        booking.status === BookingStatus.COMPLETED ||
        booking.status === BookingStatus.CANCELLED
      ) {
        throw new BadRequestException(
          'Booking cannot be paid for in its current status',
        );
      }
      if (
        booking.paymentStatus === PaymentStatus.CAPTURED ||
        booking.paymentStatus === PaymentStatus.REFUNDED
      ) {
        throw new BadRequestException('Booking is already paid');
      }
    }

    // 2. Check existing payments for these bookings
    const existingPayments = await this.paymentRepo.find({
      where:
        targetBookingIds.length === 1
          ? { bookingId: targetBookingIds[0] }
          : { bookingId: In(targetBookingIds) },
    });

    if (
      existingPayments.some(
        (p) =>
          p.status === PaymentStatus.CAPTURED ||
          p.status === PaymentStatus.REFUNDED,
      )
    ) {
      throw new BadRequestException('Booking is already paid');
    }

    const totalPriceNum = bookings.reduce(
      (sum, b) => sum + parseFloat(b.price),
      0,
    );
    const totalPriceStr = totalPriceNum.toFixed(2);
    const amountInCents = Math.round(totalPriceNum * 100);

    let clientSecret: string | null = null;
    const existingIntentIds = Array.from(
      new Set(
        existingPayments
          .map((p) => p.stripePaymentIntentId)
          .filter((id): id is string => !!id),
      ),
    );

    let sharedIntentId: string | null =
      existingPayments.length === targetBookingIds.length &&
      existingIntentIds.length === 1
        ? existingIntentIds[0]
        : null;

    // Ensure the candidate PaymentIntent isn't shared with other bookings outside this checkout
    if (sharedIntentId) {
      const allPaymentsForIntent = await this.paymentRepo.find({
        where: { stripePaymentIntentId: sharedIntentId },
      });
      if (allPaymentsForIntent && allPaymentsForIntent.length > 0) {
        const targetSet = new Set(targetBookingIds);
        const exactMatch =
          allPaymentsForIntent.length === targetSet.size &&
          allPaymentsForIntent.every((p) => targetSet.has(p.bookingId));
        if (!exactMatch) {
          sharedIntentId = null;
        }
      }
    }

    if (sharedIntentId && !sharedIntentId.startsWith('pi_mock_')) {
      const intent =
        await this.stripe.paymentIntents.retrieve(sharedIntentId);
      if (intent.status === 'succeeded') {
        await this.syncPaymentStatusByIntentId(
          sharedIntentId,
          userId,
          'admin',
        );
        throw new BadRequestException('Booking is already paid');
      }
      if (intent.status === 'canceled') {
        sharedIntentId = null;
      } else {
        clientSecret = intent.client_secret;

        if (intent.amount !== amountInCents) {
          await this.stripe.paymentIntents.update(sharedIntentId, {
            amount: amountInCents,
            metadata: {
              bookingId: targetBookingIds[0],
              bookingIds: targetBookingIds.join(','),
              userId: userId,
            },
          });
        }
      }
    }

    if (sharedIntentId && sharedIntentId.startsWith('pi_mock_')) {
      clientSecret = 'pi_mock_secret';
    } else if (!sharedIntentId) {
      // 3. Create a new Stripe PaymentIntent covering all bookings in this checkout
      try {
        const paymentIntent = await this.stripe.paymentIntents.create({
          amount: amountInCents,
          currency: 'gbp',
          metadata: {
            bookingId: targetBookingIds[0],
            bookingIds: targetBookingIds.join(','),
            userId: userId,
          },
          automatic_payment_methods: {
            enabled: true,
          },
        });

        sharedIntentId = paymentIntent.id;
        clientSecret = paymentIntent.client_secret;
        this.logger.log(
          `Created Stripe PaymentIntent ${paymentIntent.id} for booking(s) ${targetBookingIds.join(', ')}`,
        );
      } catch (err: any) {
        this.logger.error('Failed to create Stripe PaymentIntent', err);
        if (
          err.message?.includes('Invalid API Key') ||
          !this.config.get('app.stripe.secret') ||
          this.config.get('app.stripe.secret') === 'sk_test_replace_me'
        ) {
          this.logger.warn('Mocking payment intent for development');
          sharedIntentId = 'pi_mock_' + Date.now();
          clientSecret = 'pi_mock_secret';
          this.logger.log(
            `Created Mock PaymentIntent for booking(s) ${targetBookingIds.join(', ')}`,
          );
        } else {
          throw new BadRequestException('Payment gateway error');
        }
      }
    }

    // 4. Upsert Payment record per booking
    const savedPayments: Payment[] = [];
    for (const booking of bookings) {
      let payment = existingPayments.find(
        (p) => p.bookingId === booking.bookingId,
      );
      const split = splitPayout(booking.price);
      if (payment) {
        payment.stripePaymentIntentId = sharedIntentId!;
        payment.amount = booking.price;
        payment.platformFee = split.platformFee;
        payment.vendorPayout = split.vendorPayout;
      } else {
        const transactionReference =
          'TXN-' + crypto.randomBytes(4).toString('hex').toUpperCase();
        payment = this.paymentRepo.create({
          bookingId: booking.bookingId,
          stripePaymentIntentId: sharedIntentId!,
          transactionReference,
          amount: booking.price,
          platformFee: split.platformFee,
          vendorPayout: split.vendorPayout,
          status: PaymentStatus.PENDING,
        });
      }
      savedPayments.push(await this.paymentRepo.save(payment));
    }

    const primaryPayment = savedPayments[0];
    return {
      ...this.toResponse(primaryPayment, clientSecret ?? undefined),
      bookingIds: targetBookingIds,
      amount: totalPriceStr,
    };
  }

  async syncPaymentStatusByIntentId(
    paymentIntentId: string,
    userId: string,
    userRole?: string,
  ): Promise<PaymentResponse> {
    const foundList = await this.paymentRepo.find({
      where: { stripePaymentIntentId: paymentIntentId },
    });
    const payments =
      foundList && foundList.length > 0
        ? foundList
        : await this.paymentRepo
            .findOne({ where: { stripePaymentIntentId: paymentIntentId } })
            .then((p) => (p ? [p] : []));

    if (payments.length === 0) {
      throw new NotFoundException('Payment record not found');
    }

    // Verify booking ownership if the user is not an admin
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      for (const p of payments) {
        await this.bookingsService.verifyMyBooking(p.bookingId, userId);
      }
    }

    if (!paymentIntentId.startsWith('pi_mock_')) {
      try {
        const intent =
          await this.stripe.paymentIntents.retrieve(paymentIntentId);
        let newStatus = payments[0].status;

        if (intent.status === 'succeeded') {
          newStatus = PaymentStatus.CAPTURED;
        } else if (intent.status === 'processing') {
          newStatus = PaymentStatus.PROCESSING;
        } else if (
          intent.status === 'requires_payment_method' ||
          intent.status === 'requires_action'
        ) {
          newStatus = PaymentStatus.PENDING;
        } else if (intent.status === 'canceled') {
          newStatus = PaymentStatus.FAILED;
        }

        for (const payment of payments) {
          // Never overwrite an already-refunded payment back to CAPTURED when syncing a succeeded PaymentIntent
          if (payment.status === PaymentStatus.REFUNDED) {
            continue;
          }
          if (payment.status !== newStatus) {
            payment.status = newStatus;
            await this.paymentRepo.save(payment);
            this.logger.log(
              `Payment status synced to ${newStatus} for intent ${paymentIntentId} (booking ${payment.bookingId})`,
            );
            await this.bookingsService.updatePaymentStatus(
              payment.bookingId,
              newStatus,
            );
          }
        }
      } catch (e) {
        this.logger.error(
          `Failed to retrieve payment intent ${paymentIntentId} from Stripe`,
          e,
        );
      }
    }

    return {
      ...this.toResponse(payments[0]),
      bookingIds: payments.map((p) => p.bookingId),
    };
  }

  async syncPaymentStatusByBookingId(
    bookingId: string,
  ): Promise<PaymentResponse> {
    const payment = await this.paymentRepo.findOne({ where: { bookingId } });
    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }
    // We pass 'admin' role to bypass the ownership check
    return this.syncPaymentStatusByIntentId(
      payment.stripePaymentIntentId,
      'system',
      'admin',
    );
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

    const processingEvents = ['payment_intent.processing'];

    const obj = event.data.object;
    let paymentIntentId = null;

    if (event.type.startsWith('payment_intent.')) {
      paymentIntentId = obj.id;
    } else {
      paymentIntentId =
        typeof obj.payment_intent === 'string'
          ? obj.payment_intent
          : obj.payment_intent?.id;
    }

    if (!paymentIntentId) {
      this.logger.debug(`No payment intent ID found for event ${event.type}`);
      return;
    }

    const foundList = await this.paymentRepo.find({
      where: { stripePaymentIntentId: paymentIntentId },
    });
    const payments =
      foundList && foundList.length > 0
        ? foundList
        : await this.paymentRepo
            .findOne({ where: { stripePaymentIntentId: paymentIntentId } })
            .then((p) => (p ? [p] : []));

    for (const payment of payments) {
      let newStatus = payment.status;

      if (successEvents.includes(event.type)) {
        if (payment.status !== PaymentStatus.REFUNDED) {
          newStatus = PaymentStatus.CAPTURED;
        }
      } else if (failedEvents.includes(event.type)) {
        newStatus = PaymentStatus.FAILED;
      } else if (processingEvents.includes(event.type)) {
        newStatus = PaymentStatus.PROCESSING;
      } else if (event.type.startsWith('refund.')) {
        const targetBookingId = obj.metadata?.bookingId;
        if (targetBookingId && targetBookingId !== payment.bookingId) {
          continue;
        }
        if (obj.status === 'succeeded') {
          newStatus = PaymentStatus.REFUNDED;
        } else if (obj.status === 'failed') {
          newStatus = PaymentStatus.CAPTURED;
        }
      } else if (event.type === 'charge.refunded') {
        const isPartialMultiBookingCharge =
          payments.length > 1 && obj.refunded === false;
        if (isPartialMultiBookingCharge) {
          const refundsList: any[] = obj.refunds?.data ?? [];
          const matchingRefund = refundsList.find(
            (r) =>
              r?.metadata?.bookingId === payment.bookingId &&
              r?.status === 'succeeded',
          );
          if (matchingRefund) {
            newStatus = PaymentStatus.REFUNDED;
          }
        } else {
          newStatus = PaymentStatus.REFUNDED;
        }
      }

      if (payment.status !== newStatus) {
        payment.status = newStatus;
        await this.paymentRepo.save(payment);
        this.logger.log(
          `Payment status updated to ${newStatus} for booking ${payment.bookingId}`,
        );
        await this.bookingsService.updatePaymentStatus(
          payment.bookingId,
          newStatus,
        );
      }
    }
  }

  async syncAdminPaymentStatusOverride(
    bookingId: string,
    newStatus: PaymentStatus,
  ): Promise<void> {
    let payment = await this.paymentRepo.findOne({ where: { bookingId } });
    if (payment) {
      payment.status = newStatus;
      await this.paymentRepo.save(payment);
      return;
    }

    if (
      newStatus === PaymentStatus.CAPTURED ||
      newStatus === PaymentStatus.REFUNDED
    ) {
      const booking = await this.bookingsService.findById(bookingId);
      if (booking) {
        const split = splitPayout(booking.price);
        payment = this.paymentRepo.create({
          bookingId: booking.bookingId,
          stripePaymentIntentId: 'pi_mock_admin_' + Date.now(),
          transactionReference:
            'TXN-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
          amount: booking.price,
          platformFee: split.platformFee,
          vendorPayout: split.vendorPayout,
          status: newStatus,
        });
        await this.paymentRepo.save(payment);
      }
    }
  }

  async refundBookingPayment(bookingId: string): Promise<Payment> {
    const booking = await this.bookingsService.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    let payment = await this.paymentRepo.findOne({ where: { bookingId } });

    if (
      payment?.status === PaymentStatus.REFUNDED ||
      booking.paymentStatus === PaymentStatus.REFUNDED
    ) {
      throw new BadRequestException('This booking has already been refunded.');
    }

    // If a Stripe PaymentIntent exists, check its live status in Stripe first
    let stripeIntentStatus: string | null = null;
    if (
      payment?.stripePaymentIntentId &&
      !payment.stripePaymentIntentId.startsWith('pi_mock_')
    ) {
      try {
        const intent = await this.stripe.paymentIntents.retrieve(
          payment.stripePaymentIntentId,
        );
        stripeIntentStatus = intent.status;
        if (
          intent.status === 'succeeded' &&
          payment.status !== PaymentStatus.CAPTURED
        ) {
          payment.status = PaymentStatus.CAPTURED;
          await this.paymentRepo.save(payment);
        }
      } catch (e) {
        this.logger.warn(
          `Could not retrieve Stripe PaymentIntent ${payment.stripePaymentIntentId} before refund`,
          e,
        );
      }
    }

    const isPaid =
      payment?.status === PaymentStatus.CAPTURED ||
      booking.paymentStatus === PaymentStatus.CAPTURED ||
      stripeIntentStatus === 'succeeded';

    if (!isPaid) {
      if (!payment) {
        throw new BadRequestException(
          'No payment record found for this booking. Only confirmed paid bookings can be refunded.',
        );
      }
      throw new BadRequestException(
        `Only confirmed paid bookings (Captured) can be refunded. Current payment status is "${payment.status}".`,
      );
    }

    if (
      payment?.stripePaymentIntentId &&
      !payment.stripePaymentIntentId.startsWith('pi_mock_')
    ) {
      try {
        if (stripeIntentStatus === null || stripeIntentStatus === 'succeeded') {
          const amountInCents = Math.round(
            parseFloat(payment.amount || booking.price) * 100,
          );
          await this.stripe.refunds.create({
            payment_intent: payment.stripePaymentIntentId,
            ...(amountInCents > 0 ? { amount: amountInCents } : {}),
            metadata: { bookingId },
          });
        } else if (
          stripeIntentStatus === 'requires_capture' ||
          stripeIntentStatus === 'requires_payment_method' ||
          stripeIntentStatus === 'requires_confirmation' ||
          stripeIntentStatus === 'requires_action'
        ) {
          await this.stripe.paymentIntents
            .cancel(payment.stripePaymentIntentId)
            .catch(() => undefined);
        }
      } catch (e: any) {
        this.logger.error('Failed to trigger Stripe refund', e);
        if (e?.code !== 'charge_already_refunded') {
          throw new BadRequestException(
            `Stripe refund failed: ${e?.message || 'Gateway error'}`,
          );
        }
      }
    }

    if (!payment) {
      const split = splitPayout(booking.price);
      payment = this.paymentRepo.create({
        bookingId: booking.bookingId,
        stripePaymentIntentId: 'pi_mock_admin_' + Date.now(),
        transactionReference:
          'TXN-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
        amount: booking.price,
        platformFee: split.platformFee,
        vendorPayout: split.vendorPayout,
        status: PaymentStatus.REFUNDED,
      });
    } else {
      payment.status = PaymentStatus.REFUNDED;
    }

    const savedPayment = await this.paymentRepo.save(payment);

    this.logger.log(`Refunded payment for booking ${bookingId}`);
    await this.bookingsService.updatePaymentStatus(
      bookingId,
      PaymentStatus.REFUNDED,
    );

    try {
      if (booking.status !== BookingStatus.CANCELLED) {
        await this.bookingsService.adminUpdateStatus(
          bookingId,
          BookingStatus.CANCELLED,
        );
      }
    } catch (e) {
      this.logger.error(
        'Failed to automatically transition booking to CANCELLED on refund',
        e,
      );
    }

    return savedPayment;
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
