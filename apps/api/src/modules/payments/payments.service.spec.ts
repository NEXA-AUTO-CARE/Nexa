import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BookingStatus, PaymentStatus } from '@nexa/shared';
import { Payment } from '../../database/entities';
import { BookingsService } from '../bookings/bookings.service';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentRepo: any;
  let bookingsService: any;
  let configService: any;

  beforeEach(async () => {
    paymentRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn().mockImplementation(async (p) => p),
    };
    bookingsService = {
      verifyMyBooking: jest.fn(),
      findById: jest.fn(),
      updatePaymentStatus: jest.fn(),
      adminUpdateStatus: jest.fn(),
    };
    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'app.stripe.secretKey') return 'sk_test_replace_me';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getRepositoryToken(Payment), useValue: paymentRepo },
        { provide: BookingsService, useValue: bookingsService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPaymentIntent', () => {
    it('should throw if booking is completed', async () => {
      bookingsService.verifyMyBooking.mockResolvedValue({
        bookingId: 'b1',
        status: BookingStatus.COMPLETED,
      });
      await expect(
        service.createPaymentIntent('u1', { bookingId: 'b1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if booking is already paid', async () => {
      bookingsService.verifyMyBooking.mockResolvedValue({
        bookingId: 'b1',
        status: BookingStatus.ACCEPTED,
        price: '29.99',
      });
      paymentRepo.find.mockResolvedValue([{ status: PaymentStatus.CAPTURED }]);
      await expect(
        service.createPaymentIntent('u1', { bookingId: 'b1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should mock payment intent when stripe fails (development)', async () => {
      bookingsService.verifyMyBooking.mockResolvedValue({
        bookingId: 'b1',
        status: BookingStatus.ACCEPTED,
        price: '29.99',
      });
      paymentRepo.find.mockResolvedValue([]);
      paymentRepo.create.mockReturnValue({
        paymentId: 'p1',
        bookingId: 'b1',
        status: PaymentStatus.PENDING,
        amount: '29.99',
      });

      const result = await service.createPaymentIntent('u1', {
        bookingId: 'b1',
      });
      expect(result.clientSecret).toBe('pi_mock_secret');
      expect(paymentRepo.save).toHaveBeenCalled();
    });

    it('should create a single payment intent for multiple bookings', async () => {
      bookingsService.verifyMyBooking
        .mockResolvedValueOnce({
          bookingId: 'b1',
          status: BookingStatus.BOOKED,
          price: '41.49',
        })
        .mockResolvedValueOnce({
          bookingId: 'b2',
          status: BookingStatus.BOOKED,
          price: '50.00',
        });
      paymentRepo.find.mockResolvedValue([]);
      paymentRepo.create.mockImplementation((input: any) => ({
        paymentId: `p-${input.bookingId}`,
        ...input,
      }));

      const result = await service.createPaymentIntent('u1', {
        bookingIds: ['b1', 'b2'],
      });
      expect(result.amount).toBe('91.49');
      expect(result.bookingIds).toEqual(['b1', 'b2']);
      expect(paymentRepo.save).toHaveBeenCalledTimes(2);
    });

    it('should not reuse a shared batch PaymentIntent when paying for only one booking from the batch', async () => {
      bookingsService.verifyMyBooking.mockResolvedValue({
        bookingId: 'b1',
        status: BookingStatus.BOOKED,
        price: '41.49',
      });
      // First find() checks existing payments for ['b1']; second find() checks all payments on 'pi_batch_123'
      paymentRepo.find
        .mockResolvedValueOnce([
          {
            paymentId: 'p1',
            bookingId: 'b1',
            stripePaymentIntentId: 'pi_batch_123',
            status: PaymentStatus.PENDING,
          },
        ])
        .mockResolvedValueOnce([
          {
            paymentId: 'p1',
            bookingId: 'b1',
            stripePaymentIntentId: 'pi_batch_123',
            status: PaymentStatus.PENDING,
          },
          {
            paymentId: 'p2',
            bookingId: 'b2',
            stripePaymentIntentId: 'pi_batch_123',
            status: PaymentStatus.PENDING,
          },
        ]);

      const stripeMock = (service as any).stripe;
      stripeMock.paymentIntents.create = jest.fn().mockResolvedValue({
        id: 'pi_single_b1',
        client_secret: 'pi_single_b1_secret',
      });
      stripeMock.paymentIntents.retrieve = jest.fn();

      const result = await service.createPaymentIntent('u1', {
        bookingId: 'b1',
      });

      expect(stripeMock.paymentIntents.retrieve).not.toHaveBeenCalled();
      expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 4149,
          metadata: expect.objectContaining({
            bookingId: 'b1',
            bookingIds: 'b1',
          }),
        }),
      );
      expect(result.clientSecret).toBe('pi_single_b1_secret');
      expect(paymentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingId: 'b1',
          stripePaymentIntentId: 'pi_single_b1',
        }),
      );
    });
  });

  describe('syncPaymentStatusByIntentId', () => {
    it('should sync all bookings in a batch to CAPTURED without overwriting an already REFUNDED booking', async () => {
      const p1 = {
        paymentId: 'p1',
        bookingId: 'b1',
        stripePaymentIntentId: 'pi_batch_1',
        status: PaymentStatus.REFUNDED,
        amount: '41.49',
      };
      const p2 = {
        paymentId: 'p2',
        bookingId: 'b2',
        stripePaymentIntentId: 'pi_batch_1',
        status: PaymentStatus.PENDING,
        amount: '50.00',
      };
      paymentRepo.find.mockResolvedValue([p1, p2]);
      (service as any).stripe.paymentIntents.retrieve = jest
        .fn()
        .mockResolvedValue({
          id: 'pi_batch_1',
          status: 'succeeded',
        });

      await service.syncPaymentStatusByIntentId('pi_batch_1', 'u1', 'admin');

      expect(p1.status).toBe(PaymentStatus.REFUNDED);
      expect(p2.status).toBe(PaymentStatus.CAPTURED);
      expect(bookingsService.updatePaymentStatus).toHaveBeenCalledTimes(1);
      expect(bookingsService.updatePaymentStatus).toHaveBeenCalledWith(
        'b2',
        PaymentStatus.CAPTURED,
      );
    });
  });

  describe('refundBookingPayment', () => {
    it('should refund a booking marked captured even when payment record was created via admin override', async () => {
      bookingsService.findById.mockResolvedValue({
        bookingId: 'b1',
        price: '41.49',
        status: BookingStatus.BOOKED,
        paymentStatus: PaymentStatus.CAPTURED,
      });
      paymentRepo.findOne.mockResolvedValue(null);
      paymentRepo.create.mockImplementation((input: any) => ({
        paymentId: 'p1',
        ...input,
      }));

      const result = await service.refundBookingPayment('b1');
      expect(result.status).toBe(PaymentStatus.REFUNDED);
      expect(bookingsService.updatePaymentStatus).toHaveBeenCalledWith(
        'b1',
        PaymentStatus.REFUNDED,
      );
      expect(bookingsService.adminUpdateStatus).toHaveBeenCalledWith(
        'b1',
        BookingStatus.CANCELLED,
      );
    });

    it('should issue a partial Stripe refund with bookingId metadata for one booking in a multi-vehicle batch', async () => {
      bookingsService.findById.mockResolvedValue({
        bookingId: 'b2',
        price: '50.00',
        status: BookingStatus.BOOKED,
        paymentStatus: PaymentStatus.CAPTURED,
      });
      paymentRepo.findOne.mockResolvedValue({
        paymentId: 'p2',
        bookingId: 'b2',
        stripePaymentIntentId: 'pi_real_batch_123',
        amount: '50.00',
        status: PaymentStatus.CAPTURED,
      });

      const stripeMock = (service as any).stripe;
      stripeMock.paymentIntents.retrieve = jest.fn().mockResolvedValue({
        id: 'pi_real_batch_123',
        status: 'succeeded',
      });
      stripeMock.refunds.create = jest
        .fn()
        .mockResolvedValue({ id: 're_123', status: 'succeeded' });

      const result = await service.refundBookingPayment('b2');

      expect(stripeMock.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_real_batch_123',
        amount: 5000,
        metadata: { bookingId: 'b2' },
      });
      expect(result.status).toBe(PaymentStatus.REFUNDED);
      expect(bookingsService.updatePaymentStatus).toHaveBeenCalledWith(
        'b2',
        PaymentStatus.REFUNDED,
      );
    });

    it('should reject a duplicate refund attempt on an already refunded booking', async () => {
      bookingsService.findById.mockResolvedValue({
        bookingId: 'b1',
        price: '41.49',
        status: BookingStatus.CANCELLED,
        paymentStatus: PaymentStatus.REFUNDED,
      });
      paymentRepo.findOne.mockResolvedValue({
        paymentId: 'p1',
        bookingId: 'b1',
        stripePaymentIntentId: 'pi_real_batch_123',
        amount: '41.49',
        status: PaymentStatus.REFUNDED,
      });

      await expect(service.refundBookingPayment('b1')).rejects.toThrow(
        /already been refunded/,
      );
    });

    it('should refund when DB payment was still PENDING due to missed webhook but Stripe intent succeeded', async () => {
      bookingsService.findById.mockResolvedValue({
        bookingId: 'b1',
        price: '41.49',
        status: BookingStatus.BOOKED,
        paymentStatus: PaymentStatus.PENDING,
      });
      paymentRepo.findOne.mockResolvedValue({
        paymentId: 'p1',
        bookingId: 'b1',
        stripePaymentIntentId: 'pi_real_missed_wh',
        amount: '41.49',
        status: PaymentStatus.PENDING,
      });

      const stripeMock = (service as any).stripe;
      stripeMock.paymentIntents.retrieve = jest.fn().mockResolvedValue({
        id: 'pi_real_missed_wh',
        status: 'succeeded',
      });
      stripeMock.refunds.create = jest
        .fn()
        .mockResolvedValue({ id: 're_456', status: 'succeeded' });

      const result = await service.refundBookingPayment('b1');
      expect(stripeMock.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_real_missed_wh',
        amount: 4149,
        metadata: { bookingId: 'b1' },
      });
      expect(result.status).toBe(PaymentStatus.REFUNDED);
    });
  });

  describe('handleStripeWebhook', () => {
    it('should only mark the refunded booking as REFUNDED on a partial charge.refunded webhook for a multi-booking intent', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'app.stripe.webhookSecret') return 'whsec_test';
        return null;
      });
      const p1 = {
        paymentId: 'p1',
        bookingId: 'b1',
        stripePaymentIntentId: 'pi_batch_wh',
        status: PaymentStatus.CAPTURED,
      };
      const p2 = {
        paymentId: 'p2',
        bookingId: 'b2',
        stripePaymentIntentId: 'pi_batch_wh',
        status: PaymentStatus.CAPTURED,
      };
      paymentRepo.find.mockResolvedValue([p1, p2]);

      (service as any).stripe.webhooks.constructEvent = jest
        .fn()
        .mockReturnValue({
          type: 'charge.refunded',
          data: {
            object: {
              payment_intent: 'pi_batch_wh',
              refunded: false,
              amount: 9149,
              amount_refunded: 4149,
              refunds: {
                data: [
                  {
                    id: 're_1',
                    status: 'succeeded',
                    metadata: { bookingId: 'b1' },
                  },
                ],
              },
            },
          },
        });

      await service.handleStripeWebhook('sig_test', Buffer.from('{}'));

      expect(p1.status).toBe(PaymentStatus.REFUNDED);
      expect(p2.status).toBe(PaymentStatus.CAPTURED);
      expect(bookingsService.updatePaymentStatus).toHaveBeenCalledTimes(1);
      expect(bookingsService.updatePaymentStatus).toHaveBeenCalledWith(
        'b1',
        PaymentStatus.REFUNDED,
      );
    });
  });
});
