import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BookingStatus, PaymentStatus, ServiceType } from '@nexa/shared';
import { AuditTrailService } from '../../common/audit/audit-trail.service';
import {
  Booking,
  CorporateFleetEnquiry,
  VendorProfile,
} from '../../database/entities';
import { VendorApprovalStatus } from '../../database/entities/vendor-profile.entity';
import { ReportingService } from './reporting.service';

describe('ReportingService', () => {
  let service: ReportingService;
  let mockBookings: Partial<Booking>[];
  let mockVendors: Partial<VendorProfile>[];
  let mockCorporate: Partial<CorporateFleetEnquiry>[];
  let mockCustomerCounts: Array<{ userId: string; cnt: string }>;
  let mockAuditTrail: { record: jest.Mock };
  let bookingQb: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockBookings = [
      {
        bookingId: 'b-1',
        bookingReference: 'NX-001',
        userId: 'cust-1',
        vehicleId: 'veh-1',
        vendorId: 'vend-1',
        serviceType: ServiceType.FULL,
        bookingTime: new Date('2026-11-10T10:00:00.000Z'),
        createdOn: new Date('2026-11-08T09:00:00.000Z'),
        serviceAddress: '10 Union Street, Aberdeen',
        postcode: 'AB10 1AA',
        postTown: 'Aberdeen',
        price: '70.00',
        originalPrice: '80.00',
        discountAmount: '10.00',
        addons: [{ addonId: 'a-1', name: 'Engine Bay', price: '15.00' }],
        status: BookingStatus.COMPLETED,
        paymentStatus: PaymentStatus.CAPTURED,
        customer: {
          userId: 'cust-1',
          firstName: 'Jane',
          lastName: 'Doe',
          displayName: 'Jane Doe',
          email: 'jane@example.com',
          phoneNumber: '+447700900001',
        } as any,
        vehicle: {
          vehicleId: 'veh-1',
          make: 'Audi',
          model: 'A4',
          registrationNumber: 'AB21 XYZ',
          vehicleType: 'medium',
        } as any,
        vendor: {
          userId: 'vend-1',
          firstName: 'Sam',
          lastName: 'Valet',
          displayName: 'Sam Valet',
          vendorProfile: {
            companyName: 'Aberdeen Shine',
            approvalStatus: VendorApprovalStatus.ACTIVE,
          },
        } as any,
        payment: {
          amount: '70.00',
          platformFee: '10.50',
          vendorPayout: '59.50',
          stripePaymentIntentId: 'pi_001',
          transactionReference: 'tx_001',
        } as any,
        review: { rating: 5 } as any,
        promotion: { title: 'AUTUMN10' } as any,
      },
      {
        bookingId: 'b-2',
        bookingReference: 'NX-002',
        userId: 'cust-2',
        vehicleId: 'veh-2',
        vendorId: 'vend-1',
        serviceType: ServiceType.PREMIUM,
        bookingTime: new Date('2026-11-11T14:00:00.000Z'),
        createdOn: new Date('2026-11-09T11:00:00.000Z'),
        serviceAddress: '22 Rosemount Viaduct, Aberdeen',
        postcode: 'AB25 1NS',
        postTown: 'Aberdeen',
        price: '120.00',
        originalPrice: null,
        discountAmount: null,
        addons: [],
        status: BookingStatus.CANCELLED,
        paymentStatus: PaymentStatus.REFUNDED,
        customer: {
          userId: 'cust-2',
          firstName: 'Bob',
          lastName: 'Smith',
          displayName: 'Bob Smith',
          email: 'bob@example.com',
          phoneNumber: null,
        } as any,
        vehicle: {
          vehicleId: 'veh-2',
          make: 'Land Rover',
          model: 'Defender',
          registrationNumber: 'CD22 UVW',
          vehicleType: 'large',
        } as any,
        vendor: {
          userId: 'vend-1',
          firstName: 'Sam',
          lastName: 'Valet',
          displayName: 'Sam Valet',
          vendorProfile: {
            companyName: 'Aberdeen Shine',
            approvalStatus: VendorApprovalStatus.ACTIVE,
          },
        } as any,
        payment: {
          amount: '120.00',
          platformFee: '18.00',
          vendorPayout: '102.00',
          stripePaymentIntentId: 'pi_002',
          transactionReference: 'tx_002',
        } as any,
        review: null,
        promotion: null,
      },
      {
        bookingId: 'b-3',
        bookingReference: 'NX-003',
        userId: 'cust-1',
        vehicleId: 'veh-1',
        vendorId: null,
        serviceType: ServiceType.BASIC,
        bookingTime: new Date('2026-11-12T09:00:00.000Z'),
        createdOn: new Date('2026-11-10T12:00:00.000Z'),
        serviceAddress: '5 King Street, Aberdeen',
        postcode: 'AB10 2BB',
        postTown: 'Aberdeen',
        price: '45.00',
        originalPrice: null,
        discountAmount: null,
        addons: [{ addonId: 'a-1', name: 'Engine Bay', price: '15.00' }],
        status: BookingStatus.BOOKED,
        paymentStatus: PaymentStatus.PENDING,
        customer: {
          userId: 'cust-1',
          firstName: 'Jane',
          lastName: 'Doe',
          displayName: 'Jane Doe',
          email: 'jane@example.com',
          phoneNumber: '+447700900001',
        } as any,
        vehicle: {
          vehicleId: 'veh-1',
          make: 'Audi',
          model: 'A4',
          registrationNumber: 'AB21 XYZ',
          vehicleType: 'medium',
        } as any,
        vendor: null,
        payment: null,
        review: null,
        promotion: null,
      },
    ];

    mockVendors = [
      {
        vendorId: 'vend-1',
        approvalStatus: VendorApprovalStatus.ACTIVE,
        companyName: 'Aberdeen Shine',
        user: {
          userId: 'vend-1',
          firstName: 'Sam',
          lastName: 'Valet',
          displayName: 'Sam Valet',
        } as any,
      },
    ];

    mockCorporate = [
      {
        enquiryId: 'corp-1',
        companyName: 'North Sea Logistics',
        fleetSize: 18,
        status: 'new',
      },
      {
        enquiryId: 'corp-2',
        companyName: 'Granite Motors',
        fleetSize: 12,
        status: 'invoiced',
      },
    ];

    mockCustomerCounts = [
      { userId: 'cust-1', cnt: '2' },
      { userId: 'cust-2', cnt: '1' },
    ];

    bookingQb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockImplementation(async () => mockBookings),
      getRawMany: jest.fn().mockImplementation(async () => mockCustomerCounts),
    };

    const corporateQb = {
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockImplementation(async () => mockCorporate),
    };

    mockAuditTrail = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportingService,
        {
          provide: getRepositoryToken(Booking),
          useValue: {
            createQueryBuilder: jest.fn(() => bookingQb),
          },
        },
        {
          provide: getRepositoryToken(VendorProfile),
          useValue: {
            find: jest.fn().mockImplementation(async () => mockVendors),
          },
        },
        {
          provide: getRepositoryToken(CorporateFleetEnquiry),
          useValue: {
            createQueryBuilder: jest.fn(() => corporateQb),
          },
        },
        {
          provide: AuditTrailService,
          useValue: mockAuditTrail,
        },
      ],
    }).compile();

    service = module.get<ReportingService>(ReportingService);
  });

  it('computes KPIs, timeseries, breakdowns, vendors, corporate, and customers accurately', async () => {
    const result = await service.getAnalytics({ groupBy: 'day' });

    expect(result.kpis).toEqual({
      totalBookings: 3,
      confirmedPaidBookings: 1,
      completedBookings: 1,
      cancelledBookings: 1,
      unpaidBookings: 1,
      refundedBookings: 1,
      grossRevenue: 190,
      netRevenue: 70,
      totalDiscounts: 10,
      refundedAmount: 120,
      platformFees: 10.5,
      vendorPayouts: 59.5,
      averageOrderValue: 70,
      completionRate: 33.33,
      cancellationRate: 33.33,
      averageRating: 5,
      totalReviews: 1,
    });

    expect(result.timeseries).toHaveLength(3);
    expect(result.timeseries[0]).toMatchObject({
      period: '2026-11-10',
      bookingsCount: 1,
      paidCount: 1,
      revenue: 70,
    });

    expect(result.topAddons).toEqual([
      {
        addonId: 'a-1',
        name: 'Engine Bay',
        timesBooked: 2,
        totalRevenue: 15,
      },
    ]);

    expect(result.topPostcodes[0]).toMatchObject({
      postcodeArea: 'AB10',
      bookingsCount: 2,
      revenue: 70,
    });

    expect(result.vendorPerformance).toHaveLength(1);
    expect(result.vendorPerformance[0]).toMatchObject({
      vendorId: 'vend-1',
      companyName: 'Aberdeen Shine',
      assignedBookings: 2,
      completedBookings: 1,
      cancelledBookings: 1,
      completionRate: 50,
      totalRevenue: 70,
      vendorPayout: 59.5,
      platformFee: 10.5,
      averageRating: 5,
      reviewCount: 1,
    });

    expect(result.corporate).toEqual({
      totalEnquiries: 2,
      newEnquiries: 1,
      invoicedEnquiries: 1,
      totalFleetVehiclesRequested: 30,
    });

    expect(result.customers).toEqual({
      totalCustomersInPeriod: 2,
      repeatCustomers: 1,
      newCustomers: 1,
    });

    expect(result.bookings.total).toBe(3);
    expect(result.bookings.items[0].bookingReference).toBe('NX-001');
  });

  it('paginates booking rows cleanly', async () => {
    const table = await service.getBookingsTable({ page: 2, limit: 2 });
    expect(table.total).toBe(3);
    expect(table.page).toBe(2);
    expect(table.totalPages).toBe(2);
    expect(table.items).toHaveLength(1);
    expect(table.items[0].bookingReference).toBe('NX-003');
  });

  it('validates date ranges and throws BadRequestException when startDate > endDate', async () => {
    await expect(
      service.getAnalytics({
        startDate: '2026-11-20',
        endDate: '2026-11-01',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('applies SQL filters for status, paymentStatus, serviceType, vendorId, postcode, and search', async () => {
    await service.getAnalytics({
      startDate: '2026-11-01',
      endDate: '2026-11-18',
      dateField: 'createdOn',
      status: BookingStatus.COMPLETED,
      paymentStatus: PaymentStatus.CAPTURED,
      serviceType: ServiceType.FULL,
      vendorId: 'vend-1',
      postcode: 'ab10',
      search: 'Jane',
    });

    expect(bookingQb.andWhere).toHaveBeenCalledWith(
      'b.createdOn >= :startDate',
      expect.any(Object),
    );
    expect(bookingQb.andWhere).toHaveBeenCalledWith('b.status = :status', {
      status: BookingStatus.COMPLETED,
    });
    expect(bookingQb.andWhere).toHaveBeenCalledWith(
      "UPPER(COALESCE(b.postcode, '')) LIKE :postcode",
      { postcode: 'AB10%' },
    );
  });

  it('exports bookings CSV with BOM, selected columns, and audit trail log', async () => {
    const exported = await service.exportBookingsCsv(
      { columns: 'bookingReference,customerName,finalPrice' },
      'admin-uuid-1',
    );

    expect(exported.rowCount).toBe(3);
    expect(exported.filename).toMatch(
      /^nexa-bookings-report-\d{4}-\d{2}-\d{2}\.csv$/,
    );
    expect(exported.csv.startsWith('\uFEFF')).toBe(true);
    const lines = exported.csv.slice(1).split('\r\n');
    expect(lines[0]).toBe('Booking Reference,Customer Name,Final Price (£)');
    expect(lines[1]).toBe('NX-001,Jane Doe,70.00');
    expect(mockAuditTrail.record).toHaveBeenCalledWith(
      'BOOKING_REPORT',
      expect.any(String),
      'EXPORT_BOOKINGS_CSV',
      null,
      expect.objectContaining({ rowCount: 3 }),
      'admin-uuid-1',
    );
  });

  it('exports vendor performance CSV and logs audit trail', async () => {
    const exported = await service.exportVendorsCsv({}, 'admin-uuid-1');

    expect(exported.rowCount).toBe(1);
    expect(exported.filename).toMatch(
      /^nexa-vendor-performance-\d{4}-\d{2}-\d{2}\.csv$/,
    );
    expect(exported.csv).toContain('Aberdeen Shine');
    expect(mockAuditTrail.record).toHaveBeenCalledWith(
      'VENDOR_REPORT',
      expect.any(String),
      'EXPORT_VENDORS_CSV',
      null,
      expect.objectContaining({ rowCount: 1 }),
      'admin-uuid-1',
    );
  });

  it('exports filtered bookings to Excel (.xlsx) and logs audit trail', async () => {
    const exported = await service.exportBookingsExcel(
      { status: BookingStatus.COMPLETED },
      'admin-uuid-1',
    );

    expect(exported.rowCount).toBe(3);
    expect(exported.filename).toMatch(
      /^nexa-bookings-report-\d{4}-\d{2}-\d{2}\.xlsx$/,
    );
    expect(exported.buffer.subarray(0, 2).toString('utf8')).toBe('PK');
    expect(mockAuditTrail.record).toHaveBeenCalledWith(
      'BOOKING_REPORT',
      expect.any(String),
      'EXPORT_BOOKINGS_EXCEL',
      null,
      expect.objectContaining({ rowCount: 3 }),
      'admin-uuid-1',
    );
  });

  it('exports filtered bookings & analytics to PDF and logs audit trail', async () => {
    const exported = await service.exportBookingsPdf(
      { postcode: 'AB10' },
      'admin-uuid-1',
    );

    expect(exported.rowCount).toBe(3);
    expect(exported.filename).toMatch(
      /^nexa-bookings-report-\d{4}-\d{2}-\d{2}\.pdf$/,
    );
    expect(exported.buffer.subarray(0, 5).toString('utf8')).toBe('%PDF-');
    expect(mockAuditTrail.record).toHaveBeenCalledWith(
      'BOOKING_REPORT',
      expect.any(String),
      'EXPORT_BOOKINGS_PDF',
      null,
      expect.objectContaining({ rowCount: 3 }),
      'admin-uuid-1',
    );
  });

  it('exports vendor performance to Excel (.xlsx) and logs audit trail', async () => {
    const exported = await service.exportVendorsExcel({}, 'admin-uuid-1');

    expect(exported.rowCount).toBe(1);
    expect(exported.filename).toMatch(
      /^nexa-vendor-performance-\d{4}-\d{2}-\d{2}\.xlsx$/,
    );
    expect(exported.buffer.subarray(0, 2).toString('utf8')).toBe('PK');
    expect(mockAuditTrail.record).toHaveBeenCalledWith(
      'VENDOR_REPORT',
      expect.any(String),
      'EXPORT_VENDORS_EXCEL',
      null,
      expect.objectContaining({ rowCount: 1 }),
      'admin-uuid-1',
    );
  });
});
