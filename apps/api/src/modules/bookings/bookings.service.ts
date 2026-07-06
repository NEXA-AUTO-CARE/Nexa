import * as crypto from 'crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import {
  BookingStatus,
  MINI_VALET_PRICING,
  ServiceType,
  BOOKING_FEE,
  PaymentStatus,
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
  private readonly logger = new Logger(BookingsService.name);

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
  ) { }

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

    const bookingTime = new Date(dto.bookingTime);
    if (bookingTime.getTime() - Date.now() < 48 * 60 * 60 * 1000 - 60000) {
      throw new BadRequestException('Booking must be at least 48 hours in advance');
    }

    // Mini Valet is the single base service; price is driven by vehicle category.
    const servicePriceOnly = await this.getBasePriceForCategory(
      vehicle.vehicleType,
    );
    let basePrice = servicePriceOnly;
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
    const promo = await this.promotionsService.findBestActivePromotion(userId);
    let discountAmount = 0;
    let isFreeBooking = false;
    const originalPrice = basePrice;

    if (promo) {
      const result = await this.promotionsService.calculateDiscount(
        promo,
        userId,
        basePrice,
        servicePriceOnly,
      );
      discountAmount = result.discount;
      isFreeBooking = result.isFree;
    }

    const finalPrice = Math.max(0, basePrice - discountAmount);

    const bookingReference = 'BKG-' + crypto.randomBytes(4).toString('hex').toUpperCase();

    const booking = this.bookingRepo.create({
      userId,
      bookingReference,
      vehicleId: dto.vehicleId,
      serviceType: dto.serviceType ?? ServiceType.BASIC,
      bookingTime: new Date(dto.bookingTime),
      serviceAddress: dto.serviceAddress.trim(),
      servicePhone: dto.servicePhone ? dto.servicePhone.trim() : null,
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
      addressLine1: dto.addressLine1 ?? null,
      addressLine2: dto.addressLine2 ?? null,
      addressLine3: dto.addressLine3 ?? null,
      postTown: dto.postTown ?? null,
      postcode: dto.postcode ?? null,
      uprn: dto.uprn ?? null,
      paymentStatus: PaymentStatus.PENDING,
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

    this.logger.log(
      `Booking created: ${saved.bookingId} for user ${userId} with price ${finalPrice}`,
    );

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
      relations: ['vehicle', 'customer', 'promotion', 'payment'],
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

    this.logger.log(
      `Booking ${bookingId} status changed from ${previousStatus} to ${newStatus} by user ${userId}`,
    );

    const full = await this.findByIdWithRelations(bookingId);
    this.events.emit(
      BookingStatusChangedEvent.EVENT_NAME,
      new BookingStatusChangedEvent(full, previousStatus),
    );

    return full;
  }

  async updatePaymentStatus(bookingId: string, newStatus: PaymentStatus): Promise<Booking> {
    const booking = await this.bookingRepo.findOne({ where: { bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');

    const previousStatus = booking.paymentStatus;
    booking.paymentStatus = newStatus;
    await this.bookingRepo.save(booking);

    this.logger.log(`Booking ${bookingId} payment status updated from ${previousStatus} to ${newStatus}`);

    const full = await this.findByIdWithRelations(bookingId);
    
    // If payment is now captured, emit BookingCreatedEvent
    if (newStatus === PaymentStatus.CAPTURED && previousStatus !== PaymentStatus.CAPTURED) {
      this.events.emit(
        BookingCreatedEvent.EVENT_NAME,
        new BookingCreatedEvent(full),
      );
    }
    
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

    this.logger.log(`Booking ${bookingId} cancelled by user ${userId}`);

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
    const servicePriceOnly = await this.getBasePriceForCategory(
      vehicle.vehicleType,
    );
    let basePrice = servicePriceOnly + addonsTotal;

    // Add the dynamic booking & protection fee
    const dynamicFee = await this.getBookingFee();
    basePrice += dynamicFee;

    // --- Promotion discount logic ---
    const promo = await this.promotionsService.findBestActivePromotion(userId);
    let discountAmount = 0;
    let isFreeBooking = false;
    const originalPrice = basePrice;

    if (promo) {
      const result = await this.promotionsService.calculateDiscount(
        promo,
        userId,
        basePrice,
        servicePriceOnly,
      );
      discountAmount = result.discount;
      isFreeBooking = result.isFree;
    }

    const finalPrice = Math.max(0, basePrice - discountAmount);

    const bookingReference = 'BKG-' + crypto.randomBytes(4).toString('hex').toUpperCase();

    const booking = this.bookingRepo.create({
      userId,
      bookingReference,
      vehicleId: previous.vehicleId,
      serviceType: previous.serviceType,
      bookingTime: when,
      serviceAddress: previous.serviceAddress,
      servicePhone: previous.servicePhone,
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
      paymentStatus: PaymentStatus.PENDING,
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

    const previousStatus = booking.status;
    booking.vendorId = vendorId;
    booking.status = BookingStatus.ASSIGNED;
    await this.bookingRepo.save(booking);

    const full = await this.findByIdWithRelations(bookingId);
    this.events.emit(
      BookingStatusChangedEvent.EVENT_NAME,
      new BookingStatusChangedEvent(full, previousStatus),
    );

    return full;
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

  async adminUpdateStatus(
    bookingId: string,
    newStatus: BookingStatus,
  ): Promise<Booking> {
    const booking = await this.bookingRepo.findOne({ where: { bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');

    const previousStatus = booking.status;
    booking.status = newStatus;
    await this.bookingRepo.save(booking);

    this.logger.log(
      `Booking ${bookingId} status changed from ${previousStatus} to ${newStatus} by admin`,
    );

    const full = await this.findByIdWithRelations(bookingId);
    this.events.emit(
      BookingStatusChangedEvent.EVENT_NAME,
      new BookingStatusChangedEvent(full, previousStatus),
    );

    return full;
  }

  toResponse(booking: Booking): BookingResponse {
    const v = booking.vehicle;
    return {
      bookingId: booking.bookingId,
      bookingReference: booking.bookingReference,
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
      paymentStatus: booking.paymentStatus,
      createdAt: booking.createdOn.toISOString(),
      servicePhone: booking.servicePhone ?? undefined,
      addons: booking.addons || [],
      originalPrice: booking.originalPrice ?? undefined,
      discountAmount: booking.discountAmount ?? undefined,
      promotionTitle: booking.promotion?.title ?? undefined,
      addressLine1: booking.addressLine1 ?? undefined,
      addressLine2: booking.addressLine2 ?? undefined,
      addressLine3: booking.addressLine3 ?? undefined,
      postTown: booking.postTown ?? undefined,
      postcode: booking.postcode ?? undefined,
      uprn: booking.uprn ?? undefined,
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
