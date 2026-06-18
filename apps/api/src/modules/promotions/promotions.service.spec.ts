/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PromotionStatus, PromotionType } from '@nexa/shared';
import { PromotionsService } from './promotions.service';

function makePromoRepo() {
  return {
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => x),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };
}

function makeUserPromoRepo() {
  return {
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => x),
    find: jest.fn(async () => [] as any[]),
    delete: jest.fn(),
  };
}

function makeRedemptionRepo() {
  return {
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => x),
    count: jest.fn(),
  };
}

function makeEvents() {
  return { emit: jest.fn() };
}

function makePromotion(overrides: Record<string, any> = {}) {
  return {
    promotionId: 'promo-1',
    title: 'Summer Sale',
    message: 'Get great deals!',
    type: PromotionType.ANNOUNCEMENT,
    status: PromotionStatus.DRAFT,
    discountPercent: null,
    bonanzaThreshold: null,
    bonanzaRecurring: false,
    startDate: null,
    endDate: null,
    startedAt: null,
    endedAt: null,
    startedById: null,
    endedById: null,
    createdOn: new Date(),
    redemptions: [],
    ...overrides,
  };
}

describe('PromotionsService', () => {
  let promoRepo: ReturnType<typeof makePromoRepo>;
  let redemptionRepo: ReturnType<typeof makeRedemptionRepo>;
  let userPromoRepo: ReturnType<typeof makeUserPromoRepo>;
  let events: ReturnType<typeof makeEvents>;
  let service: PromotionsService;

  beforeEach(() => {
    promoRepo = makePromoRepo();
    redemptionRepo = makeRedemptionRepo();
    userPromoRepo = makeUserPromoRepo();
    events = makeEvents();
    service = new PromotionsService(
      promoRepo as never,
      redemptionRepo as never,
      userPromoRepo as never,
      events as never,
    );
  });

  /* ---------------------------------------------------------------- */
  /*  CRUD                                                             */
  /* ---------------------------------------------------------------- */

  describe('create', () => {
    it('creates a draft announcement promotion', async () => {
      const dto = {
        title: 'Promo',
        message: 'Hello',
        type: PromotionType.ANNOUNCEMENT,
      };
      await service.create(dto, 'admin-1');
      expect(promoRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Promo',
          message: 'Hello',
          type: PromotionType.ANNOUNCEMENT,
          status: PromotionStatus.DRAFT,
        }),
      );
      expect(promoRepo.save).toHaveBeenCalled();
    });

    it('creates a percentage_discount with discountPercent', async () => {
      const dto = {
        title: 'P',
        message: 'M',
        type: PromotionType.PERCENTAGE_DISCOUNT,
        discountPercent: 15,
      };
      await service.create(dto, 'admin-1');
      expect(promoRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ discountPercent: '15.00' }),
      );
    });

    it('creates a bonanza with threshold and recurring flag', async () => {
      const dto = {
        title: 'B',
        message: 'Free!',
        type: PromotionType.BONANZA,
        bonanzaThreshold: 3,
        bonanzaRecurring: true,
      };
      await service.create(dto, 'admin-1');
      expect(promoRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          bonanzaThreshold: 3,
          bonanzaRecurring: true,
        }),
      );
    });

    it('defaults bonanzaRecurring to false when not provided', async () => {
      const dto = {
        title: 'B',
        message: 'M',
        type: PromotionType.BONANZA,
        bonanzaThreshold: 2,
      };
      await service.create(dto, 'admin-1');
      expect(promoRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ bonanzaRecurring: false }),
      );
    });

    it('throws when percentage_discount is missing discountPercent', async () => {
      const dto = {
        title: 'P',
        message: 'M',
        type: PromotionType.PERCENTAGE_DISCOUNT,
      };
      await expect(service.create(dto, 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws when bonanza is missing bonanzaThreshold', async () => {
      const dto = { title: 'B', message: 'M', type: PromotionType.BONANZA };
      await expect(service.create(dto, 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws when discountPercent is out of range', async () => {
      const dto = {
        title: 'P',
        message: 'M',
        type: PromotionType.PERCENTAGE_DISCOUNT,
        discountPercent: 101,
      };
      await expect(service.create(dto, 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findOne', () => {
    it('returns the promotion when found', async () => {
      const promo = makePromotion();
      promoRepo.findOne.mockResolvedValue(promo);
      await expect(service.findOne('promo-1')).resolves.toBe(promo);
    });

    it('throws NotFoundException when not found', async () => {
      promoRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates a draft promotion', async () => {
      const promo = makePromotion();
      promoRepo.findOne.mockResolvedValue(promo);
      await service.update('promo-1', { title: 'Updated' }, 'admin-1');
      expect(promo.title).toBe('Updated');
      expect(promoRepo.save).toHaveBeenCalledWith(promo);
    });

    it('throws when trying to edit an active promotion', async () => {
      const promo = makePromotion({ status: PromotionStatus.ACTIVE });
      promoRepo.findOne.mockResolvedValue(promo);
      await expect(
        service.update('promo-1', { title: 'X' }, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('deletes a draft promotion', async () => {
      const promo = makePromotion();
      promoRepo.findOne.mockResolvedValue(promo);
      await service.remove('promo-1');
      expect(promoRepo.remove).toHaveBeenCalledWith(promo);
    });

    it('throws when trying to delete a non-draft promotion', async () => {
      const promo = makePromotion({ status: PromotionStatus.ACTIVE });
      promoRepo.findOne.mockResolvedValue(promo);
      await expect(service.remove('promo-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Lifecycle                                                        */
  /* ---------------------------------------------------------------- */

  describe('start', () => {
    it('activates a draft promotion and emits event', async () => {
      const promo = makePromotion();
      promoRepo.findOne.mockResolvedValue(promo);
      const result = await service.start('promo-1', 'admin-1');
      expect(result.status).toBe(PromotionStatus.ACTIVE);
      expect(result.startedAt).toBeInstanceOf(Date);
      expect(result.startedById).toBe('admin-1');
      expect(events.emit).toHaveBeenCalled();
    });

    it('throws when starting a non-draft promotion', async () => {
      const promo = makePromotion({ status: PromotionStatus.ACTIVE });
      promoRepo.findOne.mockResolvedValue(promo);
      await expect(service.start('promo-1', 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('end', () => {
    it('ends an active promotion', async () => {
      const promo = makePromotion({ status: PromotionStatus.ACTIVE });
      promoRepo.findOne.mockResolvedValue(promo);
      const result = await service.end('promo-1', 'admin-1');
      expect(result.status).toBe(PromotionStatus.ENDED);
      expect(result.endedAt).toBeInstanceOf(Date);
    });

    it('throws when ending a non-active promotion', async () => {
      const promo = makePromotion({ status: PromotionStatus.DRAFT });
      promoRepo.findOne.mockResolvedValue(promo);
      await expect(service.end('promo-1', 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Discount Engine                                                  */
  /* ---------------------------------------------------------------- */

  describe('calculateDiscount', () => {
    it('returns 0 discount for announcement type', async () => {
      const promo = makePromotion({ type: PromotionType.ANNOUNCEMENT });
      const result = await service.calculateDiscount(
        promo as any,
        'user-1',
        50,
      );
      expect(result).toEqual({ discount: 0, isFree: false });
    });

    it('calculates percentage discount correctly', async () => {
      const promo = makePromotion({
        type: PromotionType.PERCENTAGE_DISCOUNT,
        discountPercent: '20.00',
      });
      const result = await service.calculateDiscount(
        promo as any,
        'user-1',
        100,
      );
      expect(result).toEqual({ discount: 20, isFree: false });
    });

    it('calculates percentage discount based on servicePriceOnly, not the totalPrice', async () => {
      const promo = makePromotion({
        type: PromotionType.PERCENTAGE_DISCOUNT,
        discountPercent: '10.00',
      });
      const result = await service.calculateDiscount(
        promo as any,
        'user-1',
        150, // totalPrice includes addons/fees
        100, // servicePriceOnly
      );
      expect(result).toEqual({ discount: 10, isFree: false });
    });

    it('rounds percentage discount to 2 decimal places', async () => {
      const promo = makePromotion({
        type: PromotionType.PERCENTAGE_DISCOUNT,
        discountPercent: '33.33',
      });
      const result = await service.calculateDiscount(
        promo as any,
        'user-1',
        10,
      );
      expect(result.discount).toBeCloseTo(3.33, 2);
    });

    describe('bonanza — one-off (default)', () => {
      const bonanzaPromo = () =>
        makePromotion({
          type: PromotionType.BONANZA,
          bonanzaThreshold: 2,
          bonanzaRecurring: false,
        });

      it('returns no discount when user has not reached threshold yet', async () => {
        redemptionRepo.count
          .mockResolvedValueOnce(1) // paidCount
          .mockResolvedValueOnce(0); // freeCount
        const result = await service.calculateDiscount(
          bonanzaPromo() as any,
          'user-1',
          50,
        );
        expect(result).toEqual({ discount: 0, isFree: false });
      });

      it('returns free booking when user reaches threshold for the first time', async () => {
        redemptionRepo.count
          .mockResolvedValueOnce(2) // paidCount — threshold reached
          .mockResolvedValueOnce(0); // freeCount — no free yet
        const result = await service.calculateDiscount(
          bonanzaPromo() as any,
          'user-1',
          50,
        );
        expect(result).toEqual({ discount: 50, isFree: true });
      });

      it('does NOT grant a second free booking in one-off mode', async () => {
        redemptionRepo.count
          .mockResolvedValueOnce(4) // paidCount
          .mockResolvedValueOnce(1); // freeCount — already got 1 free
        const result = await service.calculateDiscount(
          bonanzaPromo() as any,
          'user-1',
          50,
        );
        expect(result).toEqual({ discount: 0, isFree: false });
      });
    });

    describe('bonanza — recurring', () => {
      const recurringPromo = () =>
        makePromotion({
          type: PromotionType.BONANZA,
          bonanzaThreshold: 2,
          bonanzaRecurring: true,
        });

      it('returns free booking on first threshold crossing', async () => {
        redemptionRepo.count
          .mockResolvedValueOnce(2) // paidCount
          .mockResolvedValueOnce(0); // freeCount
        const result = await service.calculateDiscount(
          recurringPromo() as any,
          'user-1',
          50,
        );
        expect(result).toEqual({ discount: 50, isFree: true });
      });

      it('returns free booking on second threshold crossing (recurring)', async () => {
        redemptionRepo.count
          .mockResolvedValueOnce(4) // paidCount = 4, 4 % 2 === 0
          .mockResolvedValueOnce(1); // freeCount = 1 (already got one, but recurring ignores this)
        const result = await service.calculateDiscount(
          recurringPromo() as any,
          'user-1',
          50,
        );
        expect(result).toEqual({ discount: 50, isFree: true });
      });

      it('returns no discount between threshold crossings', async () => {
        redemptionRepo.count
          .mockResolvedValueOnce(3) // paidCount = 3, 3 % 2 !== 0
          .mockResolvedValueOnce(1); // freeCount
        const result = await service.calculateDiscount(
          recurringPromo() as any,
          'user-1',
          50,
        );
        expect(result).toEqual({ discount: 0, isFree: false });
      });
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Redemption recording                                             */
  /* ---------------------------------------------------------------- */

  describe('recordRedemption', () => {
    it('persists a redemption record', async () => {
      await service.recordRedemption(
        'promo-1',
        'user-1',
        'booking-1',
        50,
        true,
      );
      expect(redemptionRepo.create).toHaveBeenCalledWith({
        promotionId: 'promo-1',
        userId: 'user-1',
        bookingId: 'booking-1',
        discountAmount: '50.00',
        isFreeBooking: true,
      });
      expect(redemptionRepo.save).toHaveBeenCalled();
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Response mapping                                                 */
  /* ---------------------------------------------------------------- */

  describe('toResponse', () => {
    it('maps entity to response DTO', () => {
      const promo = makePromotion({
        discountPercent: '25.00',
        startDate: new Date('2026-06-01'),
        createdOn: new Date('2026-05-01'),
        redemptions: [{}, {}],
      });
      const res = service.toResponse(promo as any);
      expect(res.promotionId).toBe('promo-1');
      expect(res.discountPercent).toBe(25);
      expect(res.bonanzaRecurring).toBe(false);
      expect(res.totalRedemptions).toBe(2);
      expect(res.startDate).toBe('2026-06-01T00:00:00.000Z');
    });
  });

  /* ---------------------------------------------------------------- */
  /*  findBestActivePromotion                                          */
  /* ---------------------------------------------------------------- */

  describe('findBestActivePromotion', () => {
    it('returns null when no active promotions exist', async () => {
      promoRepo.find.mockResolvedValue([]);
      await expect(service.findBestActivePromotion()).resolves.toBeNull();
    });

    it('prefers percentage_discount over bonanza', async () => {
      const bonanza = makePromotion({
        type: PromotionType.BONANZA,
        status: PromotionStatus.ACTIVE,
      });
      const discount = makePromotion({
        type: PromotionType.PERCENTAGE_DISCOUNT,
        status: PromotionStatus.ACTIVE,
        discountPercent: '10.00',
      });
      promoRepo.find.mockResolvedValue([bonanza, discount]);
      const result = await service.findBestActivePromotion();
      expect(result?.type).toBe(PromotionType.PERCENTAGE_DISCOUNT);
    });

    it('returns bonanza when no percentage_discount exists', async () => {
      const bonanza = makePromotion({
        type: PromotionType.BONANZA,
        status: PromotionStatus.ACTIVE,
        bonanzaThreshold: 2,
      });
      promoRepo.find.mockResolvedValue([bonanza]);
      const result = await service.findBestActivePromotion();
      expect(result?.type).toBe(PromotionType.BONANZA);
    });

    it('returns null when only announcements are active', async () => {
      const ann = makePromotion({
        type: PromotionType.ANNOUNCEMENT,
        status: PromotionStatus.ACTIVE,
      });
      promoRepo.find.mockResolvedValue([ann]);
      await expect(service.findBestActivePromotion()).resolves.toBeNull();
    });

    it('filters out promos past their endDate', async () => {
      const expired = makePromotion({
        type: PromotionType.PERCENTAGE_DISCOUNT,
        status: PromotionStatus.ACTIVE,
        discountPercent: '10.00',
        endDate: new Date(Date.now() - 86400000), // yesterday
      });
      promoRepo.find.mockResolvedValue([expired]);
      await expect(service.findBestActivePromotion()).resolves.toBeNull();
    });
  });

  /* ---------------------------------------------------------------- */
  /*  Targeted User Assignment & findBestActivePromotion              */
  /* ---------------------------------------------------------------- */

  describe('assignToUsers', () => {
    it('saves user assignments after clearing existing ones', async () => {
      const promo = makePromotion({ promotionId: 'promo-1' });
      promoRepo.findOne.mockResolvedValue(promo);
      userPromoRepo.delete.mockResolvedValue({ affected: 1 });
      userPromoRepo.save.mockResolvedValue([]);

      await service.assignToUsers('promo-1', ['user-1', 'user-2']);

      expect(userPromoRepo.delete).toHaveBeenCalledWith({
        promotionId: 'promo-1',
      });
      expect(userPromoRepo.create).toHaveBeenCalledTimes(2);
      expect(userPromoRepo.save).toHaveBeenCalled();
    });

    it('throws NotFoundException if promotion does not exist', async () => {
      promoRepo.findOne.mockResolvedValue(null);
      await expect(
        service.assignToUsers('non-existent', ['user-1']),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAssignments', () => {
    it('returns assigned user IDs for a promotion', async () => {
      userPromoRepo.find.mockResolvedValue([
        { promotionId: 'promo-1', userId: 'user-1' },
        { promotionId: 'promo-1', userId: 'user-2' },
      ]);

      const result = await service.getAssignments('promo-1');
      expect(result).toEqual(['user-1', 'user-2']);
      expect(userPromoRepo.find).toHaveBeenCalledWith({
        where: { promotionId: 'promo-1' },
      });
    });
  });

  describe('findBestActivePromotion with targeting', () => {
    it('returns global active promotion when no assignments exist', async () => {
      const discount = makePromotion({
        type: PromotionType.PERCENTAGE_DISCOUNT,
        status: PromotionStatus.ACTIVE,
        discountPercent: '10.00',
      });
      promoRepo.find.mockResolvedValue([discount]);
      userPromoRepo.find.mockResolvedValue([]); // No assignments means global

      const result = await service.findBestActivePromotion('user-1');
      expect(result).toEqual(discount);
    });

    it('filters out targeted promotion if user is not assigned', async () => {
      const discount = makePromotion({
        promotionId: 'promo-1',
        type: PromotionType.PERCENTAGE_DISCOUNT,
        status: PromotionStatus.ACTIVE,
        discountPercent: '10.00',
      });
      promoRepo.find.mockResolvedValue([discount]);
      userPromoRepo.find.mockResolvedValue([
        { promotionId: 'promo-1', userId: 'user-2' }, // targeted to user-2 only
      ]);

      const result = await service.findBestActivePromotion('user-1');
      expect(result).toBeNull();
    });

    it('returns targeted promotion if user is assigned', async () => {
      const discount = makePromotion({
        promotionId: 'promo-1',
        type: PromotionType.PERCENTAGE_DISCOUNT,
        status: PromotionStatus.ACTIVE,
        discountPercent: '10.00',
      });
      promoRepo.find.mockResolvedValue([discount]);
      userPromoRepo.find.mockResolvedValue([
        { promotionId: 'promo-1', userId: 'user-1' }, // targeted to user-1
      ]);

      const result = await service.findBestActivePromotion('user-1');
      expect(result).toEqual(discount);
    });

    it('filters out targeted promotion for guest checkouts (no userId)', async () => {
      const discount = makePromotion({
        promotionId: 'promo-1',
        type: PromotionType.PERCENTAGE_DISCOUNT,
        status: PromotionStatus.ACTIVE,
        discountPercent: '10.00',
      });
      promoRepo.find.mockResolvedValue([discount]);
      userPromoRepo.find.mockResolvedValue([
        { promotionId: 'promo-1', userId: 'user-1' },
      ]);

      const result = await service.findBestActivePromotion();
      expect(result).toBeNull();
    });
  });
});
