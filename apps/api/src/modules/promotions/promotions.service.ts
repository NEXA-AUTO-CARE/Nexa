import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import {
  PromotionStatus,
  PromotionType,
  type CreatePromotionDto,
  type PromotionResponse,
  type UpdatePromotionDto,
} from '@nexa/shared';
import { Repository } from 'typeorm';
import { Promotion, PromotionRedemption } from '../../database/entities';
import { PromotionStartedEvent } from './events/promotion.events';

export interface DiscountResult {
  discount: number;
  isFree: boolean;
}

@Injectable()
export class PromotionsService {
  private readonly logger = new Logger(PromotionsService.name);

  constructor(
    @InjectRepository(Promotion)
    private readonly promoRepo: Repository<Promotion>,
    @InjectRepository(PromotionRedemption)
    private readonly redemptionRepo: Repository<PromotionRedemption>,
    private readonly events: EventEmitter2,
  ) {}

  /* ---------------------------------------------------------------- */
  /*  CRUD                                                             */
  /* ---------------------------------------------------------------- */

  async create(dto: CreatePromotionDto, userId: string): Promise<Promotion> {
    this.validateTypeFields(dto.type, dto.discountPercent, dto.bonanzaThreshold);

    const promo = this.promoRepo.create({
      title: dto.title,
      message: dto.message,
      type: dto.type,
      status: PromotionStatus.DRAFT,
      discountPercent: dto.discountPercent?.toFixed(2) ?? null,
      bonanzaThreshold: dto.bonanzaThreshold ?? null,
      bonanzaRecurring: dto.bonanzaRecurring ?? false,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      createdBy: userId,
    });

    return this.promoRepo.save(promo);
  }

  async findAll(): Promise<Promotion[]> {
    return this.promoRepo.find({
      relations: ['redemptions'],
      order: { createdOn: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Promotion> {
    const promo = await this.promoRepo.findOne({
      where: { promotionId: id },
      relations: ['redemptions'],
    });
    if (!promo) throw new NotFoundException('Promotion not found');
    return promo;
  }

  async update(id: string, dto: UpdatePromotionDto, userId: string): Promise<Promotion> {
    const promo = await this.findOne(id);
    if (promo.status !== PromotionStatus.DRAFT) {
      throw new BadRequestException('Only draft promotions can be edited');
    }

    if (dto.type) {
      this.validateTypeFields(
        dto.type,
        dto.discountPercent ?? (promo.discountPercent ? parseFloat(promo.discountPercent) : undefined),
        dto.bonanzaThreshold ?? promo.bonanzaThreshold ?? undefined,
      );
    }

    if (dto.title !== undefined) promo.title = dto.title;
    if (dto.message !== undefined) promo.message = dto.message;
    if (dto.type !== undefined) promo.type = dto.type;
    if (dto.discountPercent !== undefined) promo.discountPercent = dto.discountPercent.toFixed(2);
    if (dto.bonanzaThreshold !== undefined) promo.bonanzaThreshold = dto.bonanzaThreshold;
    if (dto.bonanzaRecurring !== undefined) promo.bonanzaRecurring = dto.bonanzaRecurring;
    if (dto.startDate !== undefined) promo.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.endDate !== undefined) promo.endDate = dto.endDate ? new Date(dto.endDate) : null;
    promo.updatedBy = userId;

    return this.promoRepo.save(promo);
  }

  async remove(id: string): Promise<void> {
    const promo = await this.findOne(id);
    if (promo.status !== PromotionStatus.DRAFT) {
      throw new BadRequestException('Only draft promotions can be deleted');
    }
    await this.promoRepo.remove(promo);
  }

  /* ---------------------------------------------------------------- */
  /*  Lifecycle                                                        */
  /* ---------------------------------------------------------------- */

  async start(id: string, userId: string): Promise<Promotion> {
    const promo = await this.findOne(id);
    if (promo.status !== PromotionStatus.DRAFT) {
      throw new BadRequestException('Only draft promotions can be started');
    }

    promo.status = PromotionStatus.ACTIVE;
    promo.startedAt = new Date();
    promo.startedById = userId;
    promo.updatedBy = userId;
    const saved = await this.promoRepo.save(promo);

    this.logger.log(`[LIFECYCLE] Promotion "${promo.title}" activated by ${userId}`);
    this.events.emit(PromotionStartedEvent.EVENT_NAME, new PromotionStartedEvent(saved));

    return saved;
  }

  async end(id: string, userId: string): Promise<Promotion> {
    const promo = await this.findOne(id);
    if (promo.status !== PromotionStatus.ACTIVE) {
      throw new BadRequestException('Only active promotions can be ended');
    }

    promo.status = PromotionStatus.ENDED;
    promo.endedAt = new Date();
    promo.endedById = userId;
    promo.updatedBy = userId;

    this.logger.log(`[LIFECYCLE] Promotion "${promo.title}" ended by ${userId}`);
    return this.promoRepo.save(promo);
  }

  /* ---------------------------------------------------------------- */
  /*  Discount Engine                                                  */
  /* ---------------------------------------------------------------- */

  /**
   * Find the best currently active promotion to apply.
   * Precedence: percentage_discount > bonanza > announcement.
   * Returns null if no active promotions exist.
   */
  async findBestActivePromotion(): Promise<Promotion | null> {
    const active = await this.promoRepo.find({
      where: { status: PromotionStatus.ACTIVE },
      order: { createdOn: 'ASC' },
    });

    if (active.length === 0) return null;

    // Filter out promos past their endDate
    const now = new Date();
    const valid = active.filter((p) => {
      if (p.endDate && p.endDate < now) return false;
      return true;
    });

    if (valid.length === 0) return null;

    // Prefer discount > bonanza > announcement
    const discount = valid.find((p) => p.type === PromotionType.PERCENTAGE_DISCOUNT);
    if (discount) return discount;

    const bonanza = valid.find((p) => p.type === PromotionType.BONANZA);
    if (bonanza) return bonanza;

    // Announcements don't affect pricing
    return null;
  }

  /**
   * Calculate the discount amount for a given promotion, user, and base price.
   */
  async calculateDiscount(
    promotion: Promotion,
    userId: string,
    basePrice: number,
  ): Promise<DiscountResult> {
    if (promotion.type === PromotionType.ANNOUNCEMENT) {
      return { discount: 0, isFree: false };
    }

    if (promotion.type === PromotionType.PERCENTAGE_DISCOUNT) {
      const pct = parseFloat(promotion.discountPercent ?? '0');
      const discount = Math.round(basePrice * (pct / 100) * 100) / 100;
      return { discount, isFree: false };
    }

    if (promotion.type === PromotionType.BONANZA) {
      const threshold = promotion.bonanzaThreshold ?? 2;
      const recurring = promotion.bonanzaRecurring;

      // Count how many paid (non-free) redemptions this user has for this promo
      const paidCount = await this.redemptionRepo.count({
        where: {
          promotionId: promotion.promotionId,
          userId,
          isFreeBooking: false,
        },
      });

      // Check if the user already received a free booking for this promo
      const freeCount = await this.redemptionRepo.count({
        where: {
          promotionId: promotion.promotionId,
          userId,
          isFreeBooking: true,
        },
      });

      // One-off mode: only the first threshold-crossing earns a free booking
      if (!recurring && freeCount > 0) {
        return { discount: 0, isFree: false };
      }

      // If the user has reached the threshold, next booking is free
      if (paidCount > 0 && paidCount % threshold === 0) {
        return { discount: basePrice, isFree: true };
      }

      // Not yet at threshold — full price, but will be recorded as a paid redemption
      return { discount: 0, isFree: false };
    }

    return { discount: 0, isFree: false };
  }

  /**
   * Record a promotion redemption for audit and bonanza counting.
   */
  async recordRedemption(
    promotionId: string,
    userId: string,
    bookingId: string,
    discountAmount: number,
    isFreeBooking: boolean,
  ): Promise<PromotionRedemption> {
    const redemption = this.redemptionRepo.create({
      promotionId,
      userId,
      bookingId,
      discountAmount: discountAmount.toFixed(2),
      isFreeBooking,
    });
    return this.redemptionRepo.save(redemption);
  }

  /* ---------------------------------------------------------------- */
  /*  Response mapping                                                 */
  /* ---------------------------------------------------------------- */

  toResponse(promo: Promotion): PromotionResponse {
    return {
      promotionId: promo.promotionId,
      title: promo.title,
      message: promo.message,
      type: promo.type,
      status: promo.status,
      discountPercent: promo.discountPercent ? parseFloat(promo.discountPercent) : null,
      bonanzaThreshold: promo.bonanzaThreshold,
      bonanzaRecurring: promo.bonanzaRecurring ?? false,
      startDate: promo.startDate?.toISOString() ?? null,
      endDate: promo.endDate?.toISOString() ?? null,
      startedAt: promo.startedAt?.toISOString() ?? null,
      endedAt: promo.endedAt?.toISOString() ?? null,
      totalRedemptions: promo.redemptions?.length ?? 0,
      createdAt: promo.createdOn.toISOString(),
    };
  }

  /* ---------------------------------------------------------------- */
  /*  Validation helpers                                               */
  /* ---------------------------------------------------------------- */

  private validateTypeFields(
    type: PromotionType,
    discountPercent?: number,
    bonanzaThreshold?: number,
  ): void {
    if (type === PromotionType.PERCENTAGE_DISCOUNT) {
      if (discountPercent === undefined || discountPercent === null) {
        throw new BadRequestException('discountPercent is required for percentage_discount promotions');
      }
      if (discountPercent < 1 || discountPercent > 100) {
        throw new BadRequestException('discountPercent must be between 1 and 100');
      }
    }

    if (type === PromotionType.BONANZA) {
      if (bonanzaThreshold === undefined || bonanzaThreshold === null) {
        throw new BadRequestException('bonanzaThreshold is required for bonanza promotions');
      }
      if (bonanzaThreshold < 1) {
        throw new BadRequestException('bonanzaThreshold must be at least 1');
      }
    }
  }
}
