import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import {
  BookingStatus,
  MINI_VALET_PRICING,
  ServiceType,
  BOOKING_FEE,
} from '@nexa/shared';
import type { BookingResponse } from '@nexa/shared';
import { In, Repository } from 'typeorm';
import {
  Booking,
  Vehicle,
  ServiceAddon,
  Review,
} from '../../database/entities';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import {
  BookingCancelledEvent,
  BookingCreatedEvent,
  BookingStatusChangedEvent,
} from './events/booking.events';
import { SettingsService } from '../settings/settings.service';
import { PromotionsService } from '../promotions/promotions.service';

/** Valid status transitions */
const TRANSITIONS: Record<string, string[]> = {
  [BookingStatus.BOOKED]: [BookingStatus.ACCEPTED, BookingStatus.CANCELLED],
  [BookingStatus.ACCEPTED]: [
    BookingStatus.IN_PROGRESS,
    BookingStatus.CANCELLED,
  ],
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
    @InjectRepository(ServiceAddon)
    private readonly addonRepo: Repository<ServiceAddon>,
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    private readonly events: EventEmitter2,
    private readonly settingsService: SettingsService,
    private readonly promotionsService: PromotionsService,
  ) {}

  async getBasePriceForCategory(vehicleType: string): Promise<number> {
    let categoryPricing = MINI_VALET_PRICING;
    try {
      const setting = await this.settingsService.findOne(
        'car_category_pricing',
      );
      if (setting && setting.value) {
        categoryPricing = JSON.parse(setting.value);
      }
    } catch {
      // Fallback gracefully
    }
    const priceString =
      categoryPricing[vehicleType as any] ??
      MINI_VALET_PRICING[vehicleType as any];
    const parsed = parseFloat(priceString);
    return Number.isNaN(parsed) ? 0.0 : parsed;
  }

  async getBookingFee(): Promise<number> {
    let fee = BOOKING_FEE;
    try {
      const setting = await this.settingsService.findOne('booking_fee');
      if (setting && setting.value) {
        fee = setting.value;
      }
    } catch {
      // Fallback gracefully
    }
    const parsed = parseFloat(fee);
    return Number.isNaN(parsed) ? 0.0 : parsed;
  }

  async create(userId: string, dto: CreateBookingDto): Promise<Booking> {
    // Verify the vehicle belongs to the user
    const vehicle = await this.verifyMyVehicle(dto, userId);
    if (!vehicle) {
      throw new BadRequestException(
        'Vehicle not found or does not belong to you',
      );
    }

    // Mini Valet is the single base service; price is driven by vehicle category.
    let basePrice = await this.getBasePriceForCategory(vehicle.vehicleType);
    let addonsSnapshot: { addonId: string; name: string; price: string }[] = [];

    if (dto.addonIds && dto.addonIds.length > 0) {
      const addons = await this.addonRepo.find({
        where: { addonId: In(dto.addonIds), isActive: true },
      });

      if (addons.length !== dto.addonIds.length) {
        throw new BadRequestException(
          'One or more selected add-ons are invalid or inactive',
        );
      }

      addonsSnapshot = addons.map((a) => ({
        addonId: a.addonId,
        name: a.name,
        price: a.price,
      }));

      const addonsTotal = addons.reduce(
        (sum, a) => sum + parseFloat(a.price),
        0,
      );
      basePrice += addonsTotal;
    }

    // Add the dynamic booking & protection fee
    const dynamicFee = await this.getBookingFee();
    basePrice += dynamicFee;

    // --- Promotion discount logic ---
    const promo = await this.promotionsService.findBestActivePromotion();
    let discountAmount = 0;
    let isFreeBooking = false;
    const originalPrice = basePrice;

    if (promo) {
      const result = await this.promotionsService.calculateDiscount(
        promo,
        userId,
        basePrice,
      );
      discountAmount = result.discount;
      isFreeBooking = result.isFree;
    }

    const finalPrice = Math.max(0, basePrice - discountAmount);

    const booking = this.bookingRepo.create({
      userId,
      vehicleId: dto.vehicleId,
      serviceType: dto.serviceType ?? ServiceType.BASIC,
      bookingTime: new Date(dto.bookingTime),
      serviceAddress: dto.serviceAddress.trim(),
      latitude: dto.latitude?.toString() ?? null,
      longitude: dto.longitude?.toString() ?? null,
      price: finalPrice.toFixed(2),
      addons: addonsSnapshot,
      agreedSafeSpace: dto.agreedSafeSpace,
      agreedDetailsCorrect: dto.agreedDetailsCorrect,
      status: BookingStatus.BOOKED,
      promotionId: promo?.promotionId ?? null,
      originalPrice: promo ? originalPrice.toFixed(2) : null,
      discountAmount: promo ? discountAmount.toFixed(2) : null,
    });

    const saved = await this.bookingRepo.save(booking);

    // Record promotion redemption (for bonanza counting and audit)
    if (promo) {
      await this.promotionsService.recordRedemption(
        promo.promotionId,
        userId,
        saved.bookingId,
        discountAmount,
        isFreeBooking,
      );
    }

    // Load relations for the event
    const full = await this.findByIdWithRelations(saved.bookingId);
    this.events.emit(
      BookingCreatedEvent.EVENT_NAME,
      new BookingCreatedEvent(full),
    );

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
      relations: ['vehicle', 'customer', 'promotion'],
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async updateStatus(
    bookingId: string,
    userId: string,
    newStatus: BookingStatus,
  ): Promise<Booking> {
    const booking = await this.verifyMyBooking(bookingId, userId);
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
    // Verify the booking belongs to the user
    const booking = await this.verifyMyBooking(bookingId, userId);
    if (!booking) {
      throw new BadRequestException(
        'Booking not found or does not belong to you',
      );
    }

    // TODO: Implement cancellation logic - potentially with a refund system if the booking was paid for
    await this.updateStatus(bookingId, userId, BookingStatus.CANCELLED);

    // TODO: Emit event for cancellation - potentially with a refund (Admin approval needed) system if the booking was paid for.
    this.events.emit(
      BookingCancelledEvent.EVENT_NAME,
      new BookingCancelledEvent(booking),
    );
  }

  /**
   * Re-book a wash for a vehicle the customer has booked before, reusing the
   * prior vehicle, address, service and add-ons. Consent carries over (the
   * customer already agreed on the original booking). Price is recomputed from
   * the vehicle's current category.
   */
  async rebook(
    previousBookingId: string,
    userId: string,
    bookingTime?: string,
  ): Promise<Booking> {
    const previous = await this.verifyMyBooking(previousBookingId, userId);

    const vehicle = await this.vehicleRepo.findOne({
      where: { vehicleId: previous.vehicleId, ownerId: userId },
    });
    if (!vehicle) {
      throw new BadRequestException(
        'The vehicle for this booking no longer exists',
      );
    }

    const when = bookingTime
      ? new Date(bookingTime)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);

    const addonsTotal = (previous.addons ?? []).reduce(
      (sum, a) => sum + parseFloat(a.price),
      0,
    );
    let basePrice = await this.getBasePriceForCategory(vehicle.vehicleType);
    basePrice += addonsTotal;

    // Add the dynamic booking & protection fee
    const dynamicFee = await this.getBookingFee();
    basePrice += dynamicFee;

    // --- Promotion discount logic ---
    const promo = await this.promotionsService.findBestActivePromotion();
    let discountAmount = 0;
    let isFreeBooking = false;
    const originalPrice = basePrice;

    if (promo) {
      const result = await this.promotionsService.calculateDiscount(
        promo,
        userId,
        basePrice,
      );
      discountAmount = result.discount;
      isFreeBooking = result.isFree;
    }

    const finalPrice = Math.max(0, basePrice - discountAmount);

    const booking = this.bookingRepo.create({
      userId,
      vehicleId: previous.vehicleId,
      serviceType: previous.serviceType,
      bookingTime: when,
      serviceAddress: previous.serviceAddress,
      latitude: previous.latitude,
      longitude: previous.longitude,
      price: finalPrice.toFixed(2),
      addons: previous.addons ?? [],
      agreedSafeSpace: previous.agreedSafeSpace,
      agreedDetailsCorrect: previous.agreedDetailsCorrect,
      status: BookingStatus.BOOKED,
      promotionId: promo?.promotionId ?? null,
      originalPrice: promo ? originalPrice.toFixed(2) : null,
      discountAmount: promo ? discountAmount.toFixed(2) : null,
    });

    const saved = await this.bookingRepo.save(booking);

    // Record promotion redemption
    if (promo) {
      await this.promotionsService.recordRedemption(
        promo.promotionId,
        userId,
        saved.bookingId,
        discountAmount,
        isFreeBooking,
      );
    }

    const full = await this.findByIdWithRelations(saved.bookingId);
    this.events.emit(
      BookingCreatedEvent.EVENT_NAME,
      new BookingCreatedEvent(full),
    );
    return full;
  }

  // Admin related booking methods
  async findAllForAdmin(): Promise<Booking[]> {
    return this.bookingRepo.find({
      relations: ['vehicle', 'customer', 'vendor'],
      order: { bookingTime: 'DESC' },
    });
  }

  async assignVendor(bookingId: string, vendorId: string): Promise<Booking> {
    const booking = await this.bookingRepo.findOne({ where: { bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    booking.vendorId = vendorId;
    await this.bookingRepo.save(booking);
    return this.findByIdWithRelations(bookingId);
  }

  async acceptBooking(bookingId: string, userId: string): Promise<Booking> {
    return await this.updateStatus(bookingId, userId, BookingStatus.ACCEPTED);
  }

  async inProgressBooking(bookingId: string, userId: string): Promise<Booking> {
    return await this.updateStatus(
      bookingId,
      userId,
      BookingStatus.IN_PROGRESS,
    );
  }

  async completeBooking(bookingId: string, userId: string): Promise<Booking> {
    return await this.updateStatus(bookingId, userId, BookingStatus.COMPLETED);
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
      latitude: booking.latitude ? parseFloat(booking.latitude) : undefined,
      longitude: booking.longitude ? parseFloat(booking.longitude) : undefined,
      price: booking.price,
      status: booking.status,
      createdAt: booking.createdOn.toISOString(),
      addons: booking.addons || [],
      originalPrice: booking.originalPrice ?? undefined,
      discountAmount: booking.discountAmount ?? undefined,
      promotionTitle: booking.promotion?.title ?? undefined,
    };
  }

  async verifyMyVehicle(dto: CreateBookingDto, userId: string) {
    return await this.vehicleRepo.findOne({
      where: { vehicleId: dto.vehicleId, ownerId: userId },
    });
  }

  async verifyMyBooking(bookingId: string, userId: string) {
    const booking = await this.bookingRepo.findOne({
      where: { bookingId, userId },
      relations: ['customer', 'vehicle'],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.userId !== userId) {
      throw new ForbiddenException('You do not own this booking');
    }
    return booking;
  }

  async createReview(
    bookingId: string,
    userId: string,
    dto: CreateReviewDto,
  ): Promise<Review> {
    const booking = await this.verifyMyBooking(bookingId, userId);

    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException('You can only review completed bookings');
    }

    const existing = await this.reviewRepo.findOne({ where: { bookingId } });
    if (existing) {
      throw new BadRequestException('This booking has already been reviewed');
    }

    if (!booking.vendorId) {
      throw new BadRequestException('No vendor was assigned to this booking');
    }

    const review = this.reviewRepo.create({
      bookingId,
      userId,
      vendorId: booking.vendorId,
      rating: dto.rating,
      comment: dto.comment?.trim() || null,
    });

    return await this.reviewRepo.save(review);
  }
}
