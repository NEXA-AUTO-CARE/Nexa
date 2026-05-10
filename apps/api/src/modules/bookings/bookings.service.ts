import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { BookingStatus, ServiceType } from '@nexa/shared';
import type { BookingResponse } from '@nexa/shared';
import { Repository } from 'typeorm';
import { Booking, Vehicle } from '../../database/entities';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingCreatedEvent, BookingStatusChangedEvent } from './events/booking.events';

/** Hard-coded pricing for MVP — replace with a pricing module later -potentially from the admin configured setiings in the database */
const PRICING: Record<string, string> = {
  [ServiceType.BASIC]: '29.99',
  [ServiceType.FULL]: '59.99',
  [ServiceType.PREMIUM]: '99.99',
};

/** Valid status transitions */
const TRANSITIONS: Record<string, string[]> = {
  [BookingStatus.BOOKED]: [BookingStatus.ACCEPTED, BookingStatus.CANCELLED],
  [BookingStatus.ACCEPTED]: [BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED],
  [BookingStatus.IN_PROGRESS]: [BookingStatus.COMPLETED],
  [BookingStatus.COMPLETED]: [],
  [BookingStatus.CANCELLED]: [],
};

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Vehicle)
    private readonly vehicleRepo: Repository<Vehicle>,
    private readonly events: EventEmitter2,
  ) { }

  async create(userId: string, dto: CreateBookingDto): Promise<Booking> {
    // Verify the vehicle belongs to the user
    const vehicle = await verifyMyVehicle(dto, userId);
    if (!vehicle) {
      throw new BadRequestException('Vehicle not found or does not belong to you');
    }

    const booking = this.bookingRepo.create({
      userId,
      vehicleId: dto.vehicleId,
      serviceType: dto.serviceType,
      bookingTime: new Date(dto.bookingTime),
      serviceAddress: dto.serviceAddress.trim(),
      latitude: dto.latitude?.toString() ?? null,
      longitude: dto.longitude?.toString() ?? null,
      price: PRICING[dto.serviceType] ?? PRICING[ServiceType.BASIC],
      status: BookingStatus.BOOKED,
    });

    const saved = await this.bookingRepo.save(booking);

    // Load relations for the event
    const full = await this.findByIdWithRelations(saved.bookingId);
    this.events.emit(BookingCreatedEvent.EVENT_NAME, new BookingCreatedEvent(full));

    return full;
  }

  async findAllByUser(userId: string): Promise<Booking[]> {
    return this.bookingRepo.find({
      where: { userId },
      relations: ['vehicle'],
      order: { bookingTime: 'DESC' },
    });
  }

  async findById(bookingId: string): Promise<Booking> {
    const booking = await this.bookingRepo.findOne({
      where: { bookingId },
      relations: ['vehicle'],
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async findByIdWithRelations(bookingId: string): Promise<Booking> {
    const booking = await this.bookingRepo.findOne({
      where: { bookingId },
      relations: ['vehicle', 'customer'],
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async findByIdForUser(bookingId: string, userId: string): Promise<Booking> {
    const booking = await this.findById(bookingId);
    if (booking.userId !== userId) {
      throw new ForbiddenException('You do not own this booking');
    }
    return booking;
  }

  async updateStatus(
    bookingId: string,
    userId: string,
    newStatus: BookingStatus,
  ): Promise<Booking> {
    const booking = await this.findByIdForUser(bookingId, userId);
    const allowed = TRANSITIONS[booking.status] ?? [];

    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from "${booking.status}" to "${newStatus}"`,
      );
    }

    const previousStatus = booking.status;
    booking.status = newStatus;
    await this.bookingRepo.save(booking);

    const full = await this.findByIdWithRelations(bookingId);
    this.events.emit(
      BookingStatusChangedEvent.EVENT_NAME,
      new BookingStatusChangedEvent(full, previousStatus),
    );

    return full;
  }

  async cancel(bookingId: string, userId: string): Promise<void> {
    await this.updateStatus(bookingId, userId, BookingStatus.CANCELLED);
  }

  toResponse(booking: Booking): BookingResponse {
    const v = booking.vehicle;
    return {
      bookingId: booking.bookingId,
      vehicleId: booking.vehicleId,
      vehicleSummary: v
        ? `${v.make} ${v.model} (${v.registrationNumber})`
        : booking.vehicleId,
      serviceType: booking.serviceType,
      bookingTime: booking.bookingTime.toISOString(),
      serviceAddress: booking.serviceAddress,
      price: booking.price,
      status: booking.status,
      createdAt: booking.createdOn.toISOString(),
    };
  }
}

async function verifyMyVehicle(dto: CreateBookingDto, userId: string) {
  return await this.vehicleRepo.findOne({
    where: { vehicleId: dto.vehicleId, ownerId: userId },
  });
}

