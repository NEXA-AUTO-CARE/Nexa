import * as crypto from 'crypto';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  BookingStatus,
  BUSINESS_TIME_ZONE,
  PaymentStatus,
  type AddonAnalyticsRow,
  type BookingReportRow,
  type BreakdownItem,
  type CorporateSummary,
  type CustomerSummary,
  type PostcodeAnalyticsRow,
  type ReportDateField,
  type ReportGroupBy,
  type ReportingAnalyticsResponse,
  type ReportingKpiSummary,
  type RevenueTimeseriesPoint,
  type VendorPerformanceRow,
} from '@nexa/shared';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { AuditTrailService } from '../../common/audit/audit-trail.service';
import {
  Booking,
  CorporateFleetEnquiry,
  User,
  VendorProfile,
} from '../../database/entities';
import {
  buildCsvString,
  resolveBookingCsvColumns,
  VENDOR_CSV_COLUMNS,
} from './csv.util';
import {
  buildBookingsExcelBuffer,
  buildVendorsExcelBuffer,
} from './excel.util';
import { buildReportPdfBuffer } from './pdf.util';
import { ReportingQueryDto } from './dto/reporting-query.dto';

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const STATUS_LABELS: Record<string, string> = {
  booked: 'Booked',
  assigned: 'Assigned',
  accepted: 'Accepted',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  captured: 'Captured',
  failed: 'Failed',
  refunded: 'Refunded',
};

const SERVICE_TYPE_LABELS: Record<string, string> = {
  basic: 'Express Valet (Basic)',
  full: 'Full Valet',
  premium: 'Signature Detail (Premium)',
};

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function parseMoney(val: string | number | null | undefined): number {
  if (val === null || val === undefined || val === '') return 0;
  const parsed = typeof val === 'number' ? val : parseFloat(val);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatPersonName(
  user: Pick<User, 'firstName' | 'lastName' | 'displayName'> | null | undefined,
): string {
  if (!user) return '';
  const full = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return full || user.displayName || '';
}

function extractPostcodeArea(postcode: string | null | undefined): string {
  if (!postcode) return 'Unknown';
  const normalized = postcode.trim().toUpperCase();
  if (!normalized) return 'Unknown';
  const spaceIdx = normalized.indexOf(' ');
  if (spaceIdx > 0) return normalized.slice(0, spaceIdx);
  if (normalized.length > 3) return normalized.slice(0, normalized.length - 3);
  return normalized;
}

function toBusinessDayKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function getBucketForDate(
  date: Date,
  groupBy: ReportGroupBy,
): { period: string; label: string } {
  const dayKey = toBusinessDayKey(date); // YYYY-MM-DD in Europe/London
  const [yStr, mStr, dStr] = dayKey.split('-');
  const year = Number(yStr);
  const month = Number(mStr);
  const day = Number(dStr);

  if (groupBy === 'month') {
    const period = `${yStr}-${mStr}`;
    const label = new Intl.DateTimeFormat('en-GB', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(year, month - 1, 1)));
    return { period, label };
  }

  if (groupBy === 'week') {
    const utcDate = new Date(Date.UTC(year, month - 1, day));
    const dayOfWeek = utcDate.getUTCDay(); // 0=Sun..6=Sat
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(utcDate);
    monday.setUTCDate(utcDate.getUTCDate() + diffToMonday);
    const period = monday.toISOString().slice(0, 10);
    const shortLabel = new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      timeZone: 'UTC',
    }).format(monday);
    return { period, label: `Wk ${shortLabel}` };
  }

  const label = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
  return { period: dayKey, label };
}

@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);

  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(VendorProfile)
    private readonly vendorRepo: Repository<VendorProfile>,
    @InjectRepository(CorporateFleetEnquiry)
    private readonly corporateRepo: Repository<CorporateFleetEnquiry>,
    private readonly auditTrail: AuditTrailService,
  ) {}

  private parseDateBounds(
    startDate?: string,
    endDate?: string,
  ): { start: Date | null; end: Date | null } {
    let start: Date | null = null;
    let end: Date | null = null;

    if (startDate) {
      start = DATE_ONLY_REGEX.test(startDate)
        ? new Date(`${startDate}T00:00:00.000Z`)
        : new Date(startDate);
      if (Number.isNaN(start.getTime())) {
        throw new BadRequestException('Invalid startDate');
      }
    }

    if (endDate) {
      end = DATE_ONLY_REGEX.test(endDate)
        ? new Date(`${endDate}T23:59:59.999Z`)
        : new Date(endDate);
      if (Number.isNaN(end.getTime())) {
        throw new BadRequestException('Invalid endDate');
      }
    }

    if (start && end && start.getTime() > end.getTime()) {
      throw new BadRequestException(
        'startDate must be before or equal to endDate',
      );
    }

    return { start, end };
  }

  private buildFilteredBookingsQuery(
    query: ReportingQueryDto,
    start: Date | null,
    end: Date | null,
    dateField: ReportDateField,
  ): SelectQueryBuilder<Booking> {
    const qb = this.bookingRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.customer', 'customer')
      .leftJoinAndSelect('b.vehicle', 'vehicle')
      .leftJoinAndSelect('b.vendor', 'vendor')
      .leftJoinAndSelect('vendor.vendorProfile', 'vendorProfile')
      .leftJoinAndSelect('b.payment', 'payment')
      .leftJoinAndSelect('b.review', 'review')
      .leftJoinAndSelect('b.promotion', 'promotion');

    const dateCol = dateField === 'createdOn' ? 'b.createdOn' : 'b.bookingTime';
    if (start) {
      qb.andWhere(`${dateCol} >= :startDate`, { startDate: start });
    }
    if (end) {
      qb.andWhere(`${dateCol} <= :endDate`, { endDate: end });
    }
    if (query.status) {
      qb.andWhere('b.status = :status', { status: query.status });
    }
    if (query.paymentStatus) {
      qb.andWhere('b.paymentStatus = :paymentStatus', {
        paymentStatus: query.paymentStatus,
      });
    }
    if (query.serviceType) {
      qb.andWhere('b.serviceType = :serviceType', {
        serviceType: query.serviceType,
      });
    }
    if (query.vendorId) {
      qb.andWhere('b.vendorId = :vendorId', { vendorId: query.vendorId });
    }
    if (query.postcode?.trim()) {
      const normalizedPostcode = query.postcode.trim().toUpperCase();
      qb.andWhere("UPPER(COALESCE(b.postcode, '')) LIKE :postcode", {
        postcode: `${normalizedPostcode}%`,
      });
    }
    if (query.search?.trim()) {
      const term = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        `(
          LOWER(b.bookingReference) LIKE :term OR
          LOWER(b.serviceAddress) LIKE :term OR
          LOWER(COALESCE(b.postcode, '')) LIKE :term OR
          LOWER(COALESCE(b.postTown, '')) LIKE :term OR
          LOWER(COALESCE(customer.displayName, '')) LIKE :term OR
          LOWER(COALESCE(customer.firstName, '')) LIKE :term OR
          LOWER(COALESCE(customer.lastName, '')) LIKE :term OR
          LOWER(COALESCE(customer.email, '')) LIKE :term OR
          LOWER(COALESCE(vehicle.registrationNumber, '')) LIKE :term OR
          LOWER(COALESCE(vehicle.make, '')) LIKE :term OR
          LOWER(COALESCE(vehicle.model, '')) LIKE :term
        )`,
        { term },
      );
    }

    qb.orderBy(dateCol, 'DESC').addOrderBy('b.createdOn', 'DESC');
    return qb;
  }

  private toBookingReportRow(booking: Booking): BookingReportRow {
    const vehicle = booking.vehicle;
    const customer = booking.customer;
    const vendor = booking.vendor;
    const payment = booking.payment;
    const addons = Array.isArray(booking.addons) ? booking.addons : [];
    const addonsTotal = addons.reduce((s, a) => s + parseMoney(a.price), 0);
    const addonsSummary = addons
      .map((a) => `${a.name} (£${parseMoney(a.price).toFixed(2)})`)
      .join('; ');

    return {
      bookingId: booking.bookingId,
      bookingReference: booking.bookingReference,
      createdAt: booking.createdOn.toISOString(),
      bookingTime: booking.bookingTime.toISOString(),
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      serviceType: booking.serviceType,
      vehicleType: vehicle?.vehicleType ?? 'unknown',
      vehicleSummary: vehicle
        ? `${vehicle.make} ${vehicle.model} (${vehicle.registrationNumber})`
        : booking.vehicleId,
      registrationNumber: vehicle?.registrationNumber ?? '',
      customerName: formatPersonName(customer) || 'Unknown',
      customerEmail: customer?.email ?? '',
      customerPhone: customer?.phoneNumber ?? booking.servicePhone ?? '',
      vendorId: booking.vendorId ?? null,
      vendorName: formatPersonName(vendor) || 'Unassigned',
      vendorCompany: vendor?.vendorProfile?.companyName ?? '',
      serviceAddress: booking.serviceAddress,
      postcode: booking.postcode ?? '',
      postTown: booking.postTown ?? '',
      addons: addonsSummary,
      addonsCount: addons.length,
      addonsTotal: addonsTotal.toFixed(2),
      originalPrice: (booking.originalPrice
        ? parseMoney(booking.originalPrice)
        : parseMoney(booking.price)
      ).toFixed(2),
      discountAmount: parseMoney(booking.discountAmount).toFixed(2),
      promotionTitle: booking.promotion?.title ?? '',
      finalPrice: parseMoney(booking.price).toFixed(2),
      platformFee: payment
        ? parseMoney(payment.platformFee).toFixed(2)
        : '0.00',
      vendorPayout: payment
        ? parseMoney(payment.vendorPayout).toFixed(2)
        : '0.00',
      stripePaymentIntentId: payment?.stripePaymentIntentId ?? '',
      transactionReference: payment?.transactionReference ?? '',
      rating: booking.review?.rating ?? null,
    };
  }

  private computeKpis(bookings: Booking[]): ReportingKpiSummary {
    const totalBookings = bookings.length;
    let confirmedPaidBookings = 0;
    let completedBookings = 0;
    let cancelledBookings = 0;
    let unpaidBookings = 0;
    let refundedBookings = 0;

    let netRevenue = 0;
    let totalDiscounts = 0;
    let refundedAmount = 0;
    let platformFees = 0;
    let vendorPayouts = 0;
    let ratingSum = 0;
    let totalReviews = 0;

    for (const b of bookings) {
      const price = parseMoney(b.price);
      const isCancelled = b.status === BookingStatus.CANCELLED;
      const isCaptured = b.paymentStatus === PaymentStatus.CAPTURED;
      const isRefunded = b.paymentStatus === PaymentStatus.REFUNDED;

      if (b.status === BookingStatus.COMPLETED) completedBookings += 1;
      if (isCancelled) cancelledBookings += 1;
      if (isRefunded) {
        refundedBookings += 1;
        refundedAmount += price;
      }

      if (isCaptured && !isCancelled) {
        confirmedPaidBookings += 1;
        netRevenue += price;
        totalDiscounts += parseMoney(b.discountAmount);
        if (b.payment) {
          platformFees += parseMoney(b.payment.platformFee);
          vendorPayouts += parseMoney(b.payment.vendorPayout);
        }
      } else if (!isCaptured && !isRefunded && !isCancelled) {
        unpaidBookings += 1;
      }

      if (b.review && typeof b.review.rating === 'number') {
        ratingSum += b.review.rating;
        totalReviews += 1;
      }
    }

    const grossRevenue = round2(netRevenue + refundedAmount);

    return {
      totalBookings,
      confirmedPaidBookings,
      completedBookings,
      cancelledBookings,
      unpaidBookings,
      refundedBookings,
      grossRevenue,
      netRevenue: round2(netRevenue),
      totalDiscounts: round2(totalDiscounts),
      refundedAmount: round2(refundedAmount),
      platformFees: round2(platformFees),
      vendorPayouts: round2(vendorPayouts),
      averageOrderValue:
        confirmedPaidBookings > 0
          ? round2(netRevenue / confirmedPaidBookings)
          : 0,
      completionRate:
        totalBookings > 0
          ? round2((completedBookings / totalBookings) * 100)
          : 0,
      cancellationRate:
        totalBookings > 0
          ? round2((cancelledBookings / totalBookings) * 100)
          : 0,
      averageRating: totalReviews > 0 ? round2(ratingSum / totalReviews) : null,
      totalReviews,
    };
  }

  private computeTimeseries(
    bookings: Booking[],
    groupBy: ReportGroupBy,
    dateField: ReportDateField,
  ): RevenueTimeseriesPoint[] {
    const map = new Map<string, RevenueTimeseriesPoint>();

    for (const b of bookings) {
      const targetDate =
        dateField === 'createdOn' ? b.createdOn : b.bookingTime;
      const { period, label } = getBucketForDate(targetDate, groupBy);
      const entry = map.get(period) ?? {
        period,
        label,
        bookingsCount: 0,
        paidCount: 0,
        cancelledCount: 0,
        revenue: 0,
        platformFees: 0,
        vendorPayouts: 0,
      };

      entry.bookingsCount += 1;
      if (b.status === BookingStatus.CANCELLED) {
        entry.cancelledCount += 1;
      }
      if (
        b.paymentStatus === PaymentStatus.CAPTURED &&
        b.status !== BookingStatus.CANCELLED
      ) {
        entry.paidCount += 1;
        entry.revenue = round2(entry.revenue + parseMoney(b.price));
        if (b.payment) {
          entry.platformFees = round2(
            entry.platformFees + parseMoney(b.payment.platformFee),
          );
          entry.vendorPayouts = round2(
            entry.vendorPayouts + parseMoney(b.payment.vendorPayout),
          );
        }
      }

      map.set(period, entry);
    }

    return Array.from(map.values()).sort((a, b) =>
      a.period.localeCompare(b.period),
    );
  }

  private computeBreakdown(
    bookings: Booking[],
    getKey: (b: Booking) => string,
    labelMap?: Record<string, string>,
  ): BreakdownItem[] {
    const total = bookings.length;
    const map = new Map<string, { count: number; revenue: number }>();

    for (const b of bookings) {
      const key = getKey(b) || 'unknown';
      const existing = map.get(key) ?? { count: 0, revenue: 0 };
      existing.count += 1;
      if (
        b.paymentStatus === PaymentStatus.CAPTURED &&
        b.status !== BookingStatus.CANCELLED
      ) {
        existing.revenue = round2(existing.revenue + parseMoney(b.price));
      }
      map.set(key, existing);
    }

    return Array.from(map.entries())
      .map(([key, stats]) => ({
        key,
        label:
          labelMap?.[key] ??
          key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        count: stats.count,
        revenue: stats.revenue,
        percentage: total > 0 ? round2((stats.count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }

  private computeTopAddons(bookings: Booking[]): AddonAnalyticsRow[] {
    const map = new Map<string, AddonAnalyticsRow>();

    for (const b of bookings) {
      if (b.status === BookingStatus.CANCELLED) continue;
      const isPaid = b.paymentStatus === PaymentStatus.CAPTURED;
      const addons = Array.isArray(b.addons) ? b.addons : [];
      for (const addon of addons) {
        const key = addon.addonId || addon.name;
        const existing = map.get(key) ?? {
          addonId: addon.addonId,
          name: addon.name,
          timesBooked: 0,
          totalRevenue: 0,
        };
        existing.timesBooked += 1;
        if (isPaid) {
          existing.totalRevenue = round2(
            existing.totalRevenue + parseMoney(addon.price),
          );
        }
        map.set(key, existing);
      }
    }

    return Array.from(map.values()).sort(
      (a, b) =>
        b.timesBooked - a.timesBooked || b.totalRevenue - a.totalRevenue,
    );
  }

  private computeTopPostcodes(bookings: Booking[]): PostcodeAnalyticsRow[] {
    const map = new Map<string, PostcodeAnalyticsRow>();

    for (const b of bookings) {
      const area = extractPostcodeArea(b.postcode);
      const existing = map.get(area) ?? {
        postcodeArea: area,
        bookingsCount: 0,
        revenue: 0,
      };
      existing.bookingsCount += 1;
      if (
        b.paymentStatus === PaymentStatus.CAPTURED &&
        b.status !== BookingStatus.CANCELLED
      ) {
        existing.revenue = round2(existing.revenue + parseMoney(b.price));
      }
      map.set(area, existing);
    }

    return Array.from(map.values())
      .sort(
        (a, b) => b.bookingsCount - a.bookingsCount || b.revenue - a.revenue,
      )
      .slice(0, 12);
  }

  private computeVendorPerformance(
    bookings: Booking[],
    vendors: VendorProfile[],
    vendorIdFilter?: string,
  ): VendorPerformanceRow[] {
    const map = new Map<
      string,
      {
        vendorId: string;
        vendorName: string;
        companyName: string | null;
        approvalStatus: string;
        assignedBookings: number;
        completedBookings: number;
        cancelledBookings: number;
        totalRevenue: number;
        vendorPayout: number;
        platformFee: number;
        ratingSum: number;
        reviewCount: number;
      }
    >();

    for (const vp of vendors) {
      if (vendorIdFilter && vp.vendorId !== vendorIdFilter) continue;
      map.set(vp.vendorId, {
        vendorId: vp.vendorId,
        vendorName: formatPersonName(vp.user) || 'Unnamed Vendor',
        companyName: vp.companyName ?? null,
        approvalStatus: vp.approvalStatus,
        assignedBookings: 0,
        completedBookings: 0,
        cancelledBookings: 0,
        totalRevenue: 0,
        vendorPayout: 0,
        platformFee: 0,
        ratingSum: 0,
        reviewCount: 0,
      });
    }

    for (const b of bookings) {
      if (!b.vendorId) continue;
      let row = map.get(b.vendorId);
      if (!row) {
        row = {
          vendorId: b.vendorId,
          vendorName: formatPersonName(b.vendor) || 'Vendor',
          companyName: b.vendor?.vendorProfile?.companyName ?? null,
          approvalStatus: b.vendor?.vendorProfile?.approvalStatus ?? 'UNKNOWN',
          assignedBookings: 0,
          completedBookings: 0,
          cancelledBookings: 0,
          totalRevenue: 0,
          vendorPayout: 0,
          platformFee: 0,
          ratingSum: 0,
          reviewCount: 0,
        };
        map.set(b.vendorId, row);
      }

      row.assignedBookings += 1;
      if (b.status === BookingStatus.COMPLETED) row.completedBookings += 1;
      if (b.status === BookingStatus.CANCELLED) row.cancelledBookings += 1;
      if (
        b.paymentStatus === PaymentStatus.CAPTURED &&
        b.status !== BookingStatus.CANCELLED
      ) {
        row.totalRevenue = round2(row.totalRevenue + parseMoney(b.price));
        if (b.payment) {
          row.vendorPayout = round2(
            row.vendorPayout + parseMoney(b.payment.vendorPayout),
          );
          row.platformFee = round2(
            row.platformFee + parseMoney(b.payment.platformFee),
          );
        }
      }
      if (b.review && typeof b.review.rating === 'number') {
        row.ratingSum += b.review.rating;
        row.reviewCount += 1;
      }
    }

    return Array.from(map.values())
      .map((v) => ({
        vendorId: v.vendorId,
        vendorName: v.vendorName,
        companyName: v.companyName,
        approvalStatus: v.approvalStatus,
        assignedBookings: v.assignedBookings,
        completedBookings: v.completedBookings,
        cancelledBookings: v.cancelledBookings,
        completionRate:
          v.assignedBookings > 0
            ? round2((v.completedBookings / v.assignedBookings) * 100)
            : 0,
        totalRevenue: v.totalRevenue,
        vendorPayout: v.vendorPayout,
        platformFee: v.platformFee,
        averageRating:
          v.reviewCount > 0 ? round2(v.ratingSum / v.reviewCount) : null,
        reviewCount: v.reviewCount,
      }))
      .sort(
        (a, b) =>
          b.totalRevenue - a.totalRevenue ||
          b.assignedBookings - a.assignedBookings,
      );
  }

  private async computeCorporateSummary(
    start: Date | null,
    end: Date | null,
  ): Promise<CorporateSummary> {
    const qb = this.corporateRepo.createQueryBuilder('c');
    if (start) {
      qb.andWhere('c.createdOn >= :startDate', { startDate: start });
    }
    if (end) {
      qb.andWhere('c.createdOn <= :endDate', { endDate: end });
    }
    const enquiries = await qb.getMany();
    return {
      totalEnquiries: enquiries.length,
      newEnquiries: enquiries.filter((e) => e.status === 'new').length,
      invoicedEnquiries: enquiries.filter((e) => e.status === 'invoiced')
        .length,
      totalFleetVehiclesRequested: enquiries.reduce(
        (sum, e) => sum + (e.fleetSize || 0),
        0,
      ),
    };
  }

  private async computeCustomerSummary(
    bookings: Booking[],
  ): Promise<CustomerSummary> {
    const customerIds = Array.from(
      new Set(bookings.map((b) => b.userId).filter(Boolean)),
    );
    if (customerIds.length === 0) {
      return {
        totalCustomersInPeriod: 0,
        repeatCustomers: 0,
        newCustomers: 0,
      };
    }

    const rawCounts = await this.bookingRepo
      .createQueryBuilder('b')
      .select('b.userId', 'userId')
      .addSelect('COUNT(*)', 'cnt')
      .where('b.userId IN (:...customerIds)', { customerIds })
      .andWhere('b.status != :cancelled', {
        cancelled: BookingStatus.CANCELLED,
      })
      .groupBy('b.userId')
      .getRawMany<{ userId: string; cnt: string }>();

    const countMap = new Map<string, number>(
      rawCounts.map((r) => [r.userId, parseInt(r.cnt, 10) || 0]),
    );

    let repeatCustomers = 0;
    for (const cid of customerIds) {
      if ((countMap.get(cid) ?? 0) >= 2) {
        repeatCustomers += 1;
      }
    }

    return {
      totalCustomersInPeriod: customerIds.length,
      repeatCustomers,
      newCustomers: customerIds.length - repeatCustomers,
    };
  }

  private async buildAnalyticsSnapshot(query: ReportingQueryDto): Promise<{
    analytics: Omit<ReportingAnalyticsResponse, 'bookings'>;
    rows: BookingReportRow[];
  }> {
    const groupBy: ReportGroupBy = query.groupBy ?? 'day';
    const dateField: ReportDateField = query.dateField ?? 'bookingTime';
    const { start, end } = this.parseDateBounds(query.startDate, query.endDate);

    const [bookings, vendors, corporate] = await Promise.all([
      this.buildFilteredBookingsQuery(query, start, end, dateField).getMany(),
      this.vendorRepo.find({ relations: ['user'] }),
      this.computeCorporateSummary(start, end),
    ]);

    const customers = await this.computeCustomerSummary(bookings);
    const rows = bookings.map((b) => this.toBookingReportRow(b));

    const analytics: Omit<ReportingAnalyticsResponse, 'bookings'> = {
      filters: {
        startDate: query.startDate ?? null,
        endDate: query.endDate ?? null,
        groupBy,
        dateField,
        status: query.status ?? null,
        paymentStatus: query.paymentStatus ?? null,
        serviceType: query.serviceType ?? null,
        vendorId: query.vendorId ?? null,
        postcode: query.postcode?.trim() || null,
        search: query.search?.trim() || null,
      },
      kpis: this.computeKpis(bookings),
      timeseries: this.computeTimeseries(bookings, groupBy, dateField),
      byStatus: this.computeBreakdown(bookings, (b) => b.status, STATUS_LABELS),
      byPaymentStatus: this.computeBreakdown(
        bookings,
        (b) => b.paymentStatus,
        PAYMENT_STATUS_LABELS,
      ),
      byServiceType: this.computeBreakdown(
        bookings,
        (b) => b.serviceType,
        SERVICE_TYPE_LABELS,
      ),
      byVehicleCategory: this.computeBreakdown(
        bookings,
        (b) => b.vehicle?.vehicleType ?? 'unknown',
      ),
      topAddons: this.computeTopAddons(bookings),
      topPostcodes: this.computeTopPostcodes(bookings),
      vendorPerformance: this.computeVendorPerformance(
        bookings,
        vendors,
        query.vendorId,
      ),
      corporate,
      customers,
    };

    return { analytics, rows };
  }

  private async recordExportAudit(
    entityType: string,
    action: string,
    actorId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.auditTrail.record(
        entityType,
        crypto.randomUUID(),
        action,
        null,
        metadata,
        actorId,
      );
    } catch (err) {
      this.logger.warn(
        `Failed to record audit trail for ${action}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async getAnalytics(
    query: ReportingQueryDto,
  ): Promise<ReportingAnalyticsResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const { analytics, rows } = await this.buildAnalyticsSnapshot(query);

    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * limit;

    return {
      ...analytics,
      bookings: {
        items: rows.slice(offset, offset + limit),
        total,
        page: safePage,
        limit,
        totalPages,
      },
    };
  }

  async getBookingsTable(
    query: ReportingQueryDto,
  ): Promise<ReportingAnalyticsResponse['bookings']> {
    const dateField: ReportDateField = query.dateField ?? 'bookingTime';
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const { start, end } = this.parseDateBounds(query.startDate, query.endDate);

    const bookings = await this.buildFilteredBookingsQuery(
      query,
      start,
      end,
      dateField,
    ).getMany();

    const allRows = bookings.map((b) => this.toBookingReportRow(b));
    const total = allRows.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * limit;

    return {
      items: allRows.slice(offset, offset + limit),
      total,
      page: safePage,
      limit,
      totalPages,
    };
  }

  async exportBookingsCsv(
    query: ReportingQueryDto,
    actorId: string,
  ): Promise<{ csv: string; filename: string; rowCount: number }> {
    const dateField: ReportDateField = query.dateField ?? 'bookingTime';
    const { start, end } = this.parseDateBounds(query.startDate, query.endDate);

    const bookings = await this.buildFilteredBookingsQuery(
      query,
      start,
      end,
      dateField,
    ).getMany();

    const rows = bookings.map((b) => this.toBookingReportRow(b));
    const columns = resolveBookingCsvColumns(query.columns);
    const csv = buildCsvString(rows, columns);

    const dateStamp = toBusinessDayKey(new Date());
    const filename = `nexa-bookings-report-${dateStamp}.csv`;

    await this.recordExportAudit(
      'BOOKING_REPORT',
      'EXPORT_BOOKINGS_CSV',
      actorId,
      {
        rowCount: rows.length,
        columns: columns.map((c) => c.key),
        filters: {
          startDate: query.startDate ?? null,
          endDate: query.endDate ?? null,
          dateField,
          status: query.status ?? null,
          paymentStatus: query.paymentStatus ?? null,
          serviceType: query.serviceType ?? null,
          vendorId: query.vendorId ?? null,
          postcode: query.postcode ?? null,
          search: query.search ?? null,
        },
      },
    );

    return { csv, filename, rowCount: rows.length };
  }

  async exportBookingsExcel(
    query: ReportingQueryDto,
    actorId: string,
  ): Promise<{ buffer: Buffer; filename: string; rowCount: number }> {
    const { analytics, rows } = await this.buildAnalyticsSnapshot(query);
    const buffer = await buildBookingsExcelBuffer(
      analytics,
      rows,
      query.columns,
    );
    const dateStamp = toBusinessDayKey(new Date());
    const filename = `nexa-bookings-report-${dateStamp}.xlsx`;

    await this.recordExportAudit(
      'BOOKING_REPORT',
      'EXPORT_BOOKINGS_EXCEL',
      actorId,
      {
        rowCount: rows.length,
        filters: analytics.filters,
      },
    );

    return { buffer, filename, rowCount: rows.length };
  }

  async exportBookingsPdf(
    query: ReportingQueryDto,
    actorId: string,
  ): Promise<{ buffer: Buffer; filename: string; rowCount: number }> {
    const { analytics, rows } = await this.buildAnalyticsSnapshot(query);
    const buffer = await buildReportPdfBuffer(analytics, rows, query.columns);
    const dateStamp = toBusinessDayKey(new Date());
    const filename = `nexa-bookings-report-${dateStamp}.pdf`;

    await this.recordExportAudit(
      'BOOKING_REPORT',
      'EXPORT_BOOKINGS_PDF',
      actorId,
      {
        rowCount: rows.length,
        filters: analytics.filters,
      },
    );

    return { buffer, filename, rowCount: rows.length };
  }

  async exportVendorsCsv(
    query: ReportingQueryDto,
    actorId: string,
  ): Promise<{ csv: string; filename: string; rowCount: number }> {
    const dateField: ReportDateField = query.dateField ?? 'bookingTime';
    const { start, end } = this.parseDateBounds(query.startDate, query.endDate);

    const [bookings, vendors] = await Promise.all([
      this.buildFilteredBookingsQuery(query, start, end, dateField).getMany(),
      this.vendorRepo.find({ relations: ['user'] }),
    ]);

    const rows = this.computeVendorPerformance(
      bookings,
      vendors,
      query.vendorId,
    );
    const csv = buildCsvString(rows, VENDOR_CSV_COLUMNS);
    const dateStamp = toBusinessDayKey(new Date());
    const filename = `nexa-vendor-performance-${dateStamp}.csv`;

    await this.recordExportAudit(
      'VENDOR_REPORT',
      'EXPORT_VENDORS_CSV',
      actorId,
      {
        rowCount: rows.length,
        filters: {
          startDate: query.startDate ?? null,
          endDate: query.endDate ?? null,
          dateField,
          vendorId: query.vendorId ?? null,
        },
      },
    );

    return { csv, filename, rowCount: rows.length };
  }

  async exportVendorsExcel(
    query: ReportingQueryDto,
    actorId: string,
  ): Promise<{ buffer: Buffer; filename: string; rowCount: number }> {
    const { analytics } = await this.buildAnalyticsSnapshot(query);
    const rows = analytics.vendorPerformance;
    const buffer = await buildVendorsExcelBuffer(rows, analytics.filters);
    const dateStamp = toBusinessDayKey(new Date());
    const filename = `nexa-vendor-performance-${dateStamp}.xlsx`;

    await this.recordExportAudit(
      'VENDOR_REPORT',
      'EXPORT_VENDORS_EXCEL',
      actorId,
      {
        rowCount: rows.length,
        filters: analytics.filters,
      },
    );

    return { buffer, filename, rowCount: rows.length };
  }
}
