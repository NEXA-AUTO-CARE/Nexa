import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BookingStatus, ServiceType } from '@nexa/shared';
import { Booking, Vehicle, ServiceAddon } from '../../database/entities';
import { BookingsService } from './bookings.service';
import { BookingCancelledEvent, BookingCreatedEvent, BookingStatusChangedEvent } from './events/booking.events';
import { SettingsService } from '../settings/settings.service';

describe('BookingsService', () => {
  let service: BookingsService;
  let bookingRepo: any;
  let vehicleRepo: any;
  let addonRepo: any;
  let events: any;
  let settingsService: any;

  beforeEach(async () => {
    bookingRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };
    vehicleRepo = {
      findOne: jest.fn(),
    };
    addonRepo = {
      find: jest.fn(),
    };
    events = {
      emit: jest.fn(),
    };
    settingsService = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: getRepositoryToken(Booking), useValue: bookingRepo },
        { provide: getRepositoryToken(Vehicle), useValue: vehicleRepo },
        { provide: getRepositoryToken(ServiceAddon), useValue: addonRepo },
        { provide: EventEmitter2, useValue: events },
        { provide: SettingsService, useValue: settingsService },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a booking and emit created event', async () => {
      vehicleRepo.findOne.mockResolvedValue({ vehicleId: 'v1', ownerId: 'u1', vehicleType: 'regular' });
      bookingRepo.create.mockReturnValue({ bookingId: 'b1', status: BookingStatus.BOOKED });
      bookingRepo.save.mockResolvedValue({ bookingId: 'b1' });
      bookingRepo.findOne.mockResolvedValue({ bookingId: 'b1', status: BookingStatus.BOOKED, customer: {} });

      const dto = {
        vehicleId: 'v1',
        serviceType: ServiceType.BASIC,
        bookingTime: '2026-05-15T10:00:00.000Z',
        serviceAddress: '123 Test St',
        agreedSafeSpace: true,
        agreedDetailsCorrect: true,
      };

      const result = await service.create('u1', dto);

      expect(vehicleRepo.findOne).toHaveBeenCalledWith({
        where: { vehicleId: 'v1', ownerId: 'u1' },
      });
      expect(bookingRepo.save).toHaveBeenCalled();
      expect(events.emit).toHaveBeenCalledWith(
        BookingCreatedEvent.EVENT_NAME,
        expect.any(BookingCreatedEvent),
      );
      expect(result.bookingId).toBe('b1');
    });

    it('should throw BadRequestException if vehicle not found or not owned', async () => {
      vehicleRepo.findOne.mockResolvedValue(null);

      const dto = {
        vehicleId: 'v1',
        serviceType: ServiceType.BASIC,
        bookingTime: '2026-05-15T10:00:00.000Z',
        serviceAddress: '123 Test St',
        agreedSafeSpace: true,
        agreedDetailsCorrect: true,
      };

      await expect(service.create('u1', dto)).rejects.toThrow(BadRequestException);
      expect(bookingRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('verifyMyBooking', () => {
    it('should return booking if found and owned by user', async () => {
      bookingRepo.findOne.mockResolvedValue({ bookingId: 'b1', userId: 'u1' });
      const result = await service.verifyMyBooking('b1', 'u1');
      expect(result.bookingId).toBe('b1');
    });

    it('should throw NotFoundException if booking does not exist', async () => {
      bookingRepo.findOne.mockResolvedValue(null);
      await expect(service.verifyMyBooking('b1', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not own booking', async () => {
      bookingRepo.findOne.mockResolvedValue({ bookingId: 'b1', userId: 'u2' });
      await expect(service.verifyMyBooking('b1', 'u1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateStatus', () => {
    it('should update status and emit status_changed event', async () => {
      const booking = { bookingId: 'b1', userId: 'u1', status: BookingStatus.BOOKED };
      // mock for verifyMyBooking
      bookingRepo.findOne.mockResolvedValueOnce(booking);
      // mock for findByIdWithRelations
      bookingRepo.findOne.mockResolvedValueOnce({ ...booking, status: BookingStatus.ACCEPTED });

      const result = await service.updateStatus('b1', 'u1', BookingStatus.ACCEPTED);

      expect(bookingRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: BookingStatus.ACCEPTED }));
      expect(events.emit).toHaveBeenCalledWith(
        BookingStatusChangedEvent.EVENT_NAME,
        expect.any(BookingStatusChangedEvent),
      );
      expect(result.status).toBe(BookingStatus.ACCEPTED);
    });

    it('should throw BadRequestException for invalid transition', async () => {
      const booking = { bookingId: 'b1', userId: 'u1', status: BookingStatus.COMPLETED };
      bookingRepo.findOne.mockResolvedValue(booking);

      await expect(service.updateStatus('b1', 'u1', BookingStatus.BOOKED)).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel', () => {
    it('should cancel booking and emit cancelled event', async () => {
      const booking = { bookingId: 'b1', userId: 'u1', status: BookingStatus.BOOKED };
      bookingRepo.findOne.mockResolvedValue(booking);

      await service.cancel('b1', 'u1');

      expect(bookingRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: BookingStatus.CANCELLED }));
      expect(events.emit).toHaveBeenCalledWith(
        BookingCancelledEvent.EVENT_NAME,
        expect.any(BookingCancelledEvent),
      );
    });
  });

  describe('admin actions', () => {
    it('should accept booking', async () => {
      const booking = { bookingId: 'b1', userId: 'u1', status: BookingStatus.BOOKED };
      bookingRepo.findOne.mockResolvedValue(booking);
      await service.acceptBooking('b1', 'u1');
      expect(bookingRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: BookingStatus.ACCEPTED }));
    });

    it('should mark booking as in-progress', async () => {
      const booking = { bookingId: 'b1', userId: 'u1', status: BookingStatus.ACCEPTED };
      bookingRepo.findOne.mockResolvedValue(booking);
      await service.inProgressBooking('b1', 'u1');
      expect(bookingRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: BookingStatus.IN_PROGRESS }));
    });

    it('should mark booking as completed', async () => {
      const booking = { bookingId: 'b1', userId: 'u1', status: BookingStatus.IN_PROGRESS };
      bookingRepo.findOne.mockResolvedValue(booking);
      await service.completeBooking('b1', 'u1');
      expect(bookingRepo.save).toHaveBeenCalledWith(expect.objectContaining({ status: BookingStatus.COMPLETED }));
    });
  });

  describe('queries', () => {
    it('findAllByUser should return list of bookings', async () => {
      const bookings = [{ bookingId: 'b1' }, { bookingId: 'b2' }];
      bookingRepo.find.mockResolvedValue(bookings);
      const result = await service.findAllByUser('u1');
      expect(result).toEqual(bookings);
      expect(bookingRepo.find).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        relations: ['vehicle'],
        order: { bookingTime: 'DESC' },
      });
    });

    it('findById should return booking', async () => {
      bookingRepo.findOne.mockResolvedValue({ bookingId: 'b1' });
      const result = await service.findById('b1');
      expect(result.bookingId).toBe('b1');
    });

    it('findById should throw NotFoundException', async () => {
      bookingRepo.findOne.mockResolvedValue(null);
      await expect(service.findById('b1')).rejects.toThrow(NotFoundException);
    });

    it('findByIdWithRelations should return booking', async () => {
      bookingRepo.findOne.mockResolvedValue({ bookingId: 'b1' });
      const result = await service.findByIdWithRelations('b1');
      expect(result.bookingId).toBe('b1');
    });

    it('findByIdWithRelations should throw NotFoundException', async () => {
      bookingRepo.findOne.mockResolvedValue(null);
      await expect(service.findByIdWithRelations('b1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('toResponse', () => {
    it('should map booking to response with vehicle relation', () => {
      const date = new Date();
      const booking = {
        bookingId: 'b1',
        vehicleId: 'v1',
        serviceType: ServiceType.BASIC,
        bookingTime: date,
        serviceAddress: '123 St',
        price: '29.99',
        status: BookingStatus.BOOKED,
        createdOn: date,
        vehicle: {
          make: 'Ford',
          model: 'Focus',
          registrationNumber: 'AB12 CDE',
        },
      } as any;

      const res = service.toResponse(booking);
      expect(res.vehicleSummary).toBe('Ford Focus (AB12 CDE)');
      expect(res.bookingId).toBe('b1');
    });

    it('should map booking to response without vehicle relation', () => {
      const date = new Date();
      const booking = {
        bookingId: 'b1',
        vehicleId: 'v1',
        serviceType: ServiceType.BASIC,
        bookingTime: date,
        serviceAddress: '123 St',
        price: '29.99',
        status: BookingStatus.BOOKED,
        createdOn: date,
      } as any;

      const res = service.toResponse(booking);
      expect(res.vehicleSummary).toBe('v1');
    });
  });
});


