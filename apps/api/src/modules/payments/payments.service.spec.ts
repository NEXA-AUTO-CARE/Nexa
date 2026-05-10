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
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    bookingsService = {
      verifyMyBooking: jest.fn(),
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
      bookingsService.verifyMyBooking.mockResolvedValue({ bookingId: 'b1', status: BookingStatus.COMPLETED });
      await expect(service.createPaymentIntent('u1', { bookingId: 'b1' })).rejects.toThrow(BadRequestException);
    });

    it('should throw if booking is already paid', async () => {
      bookingsService.verifyMyBooking.mockResolvedValue({ bookingId: 'b1', status: BookingStatus.ACCEPTED, price: '29.99' });
      paymentRepo.findOne.mockResolvedValue({ status: PaymentStatus.CAPTURED });
      await expect(service.createPaymentIntent('u1', { bookingId: 'b1' })).rejects.toThrow(BadRequestException);
    });

    it('should mock payment intent when stripe fails (development)', async () => {
      bookingsService.verifyMyBooking.mockResolvedValue({ bookingId: 'b1', status: BookingStatus.ACCEPTED, price: '29.99' });
      paymentRepo.findOne.mockResolvedValue(null);
      paymentRepo.create.mockReturnValue({
        paymentId: 'p1',
        bookingId: 'b1',
        status: PaymentStatus.PENDING,
        amount: '29.99',
      });
      
      const result = await service.createPaymentIntent('u1', { bookingId: 'b1' });
      expect(result.clientSecret).toBe('pi_mock_secret');
      expect(paymentRepo.save).toHaveBeenCalled();
    });
  });
});
