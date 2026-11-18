import * as ExcelJS from 'exceljs';
import { BookingStatus, PaymentStatus, ServiceType } from '@nexa/shared';
import type {
  BookingReportRow,
  ReportingAnalyticsResponse,
} from '@nexa/shared';
import {
  buildBookingsExcelBuffer,
  buildVendorsExcelBuffer,
} from './excel.util';

describe('excel.util', () => {
  const sampleAnalytics: Omit<ReportingAnalyticsResponse, 'bookings'> = {
    filters: {
      startDate: '2026-11-01',
      endDate: '2026-11-18',
      groupBy: 'day',
      dateField: 'bookingTime',
      status: null,
      paymentStatus: null,
      serviceType: null,
      vendorId: null,
      postcode: 'AB10',
      search: null,
    },
    kpis: {
      totalBookings: 1,
      confirmedPaidBookings: 1,
      completedBookings: 1,
      cancelledBookings: 0,
      unpaidBookings: 0,
      refundedBookings: 0,
      grossRevenue: 85,
      netRevenue: 85,
      totalDiscounts: 10,
      refundedAmount: 0,
      platformFees: 12.75,
      vendorPayouts: 72.25,
      averageOrderValue: 85,
      completionRate: 100,
      cancellationRate: 0,
      averageRating: 5,
      totalReviews: 1,
    },
    timeseries: [
      {
        period: '2026-11-10',
        label: '10 Nov',
        bookingsCount: 1,
        paidCount: 1,
        cancelledCount: 0,
        revenue: 85,
        platformFees: 12.75,
        vendorPayouts: 72.25,
      },
    ],
    byStatus: [
      {
        key: 'completed',
        label: 'Completed',
        count: 1,
        revenue: 85,
        percentage: 100,
      },
    ],
    byPaymentStatus: [
      {
        key: 'captured',
        label: 'Captured',
        count: 1,
        revenue: 85,
        percentage: 100,
      },
    ],
    byServiceType: [
      {
        key: 'full',
        label: 'Full Valet',
        count: 1,
        revenue: 85,
        percentage: 100,
      },
    ],
    byVehicleCategory: [
      {
        key: 'medium',
        label: 'Medium',
        count: 1,
        revenue: 85,
        percentage: 100,
      },
    ],
    topAddons: [],
    topPostcodes: [{ postcodeArea: 'AB10', bookingsCount: 1, revenue: 85 }],
    vendorPerformance: [
      {
        vendorId: 'v-1',
        vendorName: 'Sam Valet',
        companyName: 'Aberdeen Shine',
        approvalStatus: 'ACTIVE',
        assignedBookings: 1,
        completedBookings: 1,
        cancelledBookings: 0,
        completionRate: 100,
        totalRevenue: 85,
        vendorPayout: 72.25,
        platformFee: 12.75,
        averageRating: 5,
        reviewCount: 1,
      },
    ],
    corporate: {
      totalEnquiries: 2,
      newEnquiries: 1,
      invoicedEnquiries: 1,
      totalFleetVehiclesRequested: 20,
    },
    customers: {
      totalCustomersInPeriod: 1,
      repeatCustomers: 0,
      newCustomers: 1,
    },
  };

  const sampleRow: BookingReportRow = {
    bookingId: 'b-1',
    bookingReference: 'NX-1001',
    createdAt: '2026-11-08T10:00:00.000Z',
    bookingTime: '2026-11-10T10:00:00.000Z',
    status: BookingStatus.COMPLETED,
    paymentStatus: PaymentStatus.CAPTURED,
    serviceType: ServiceType.FULL,
    vehicleType: 'medium',
    vehicleSummary: 'Audi A4 (AB21 XYZ)',
    registrationNumber: 'AB21 XYZ',
    customerName: '=CMD("calc")',
    customerEmail: 'jane@example.com',
    customerPhone: '+447700900001',
    vendorId: 'v-1',
    vendorName: 'Sam Valet',
    vendorCompany: 'Aberdeen Shine',
    serviceAddress: '10 Union Street, Aberdeen',
    postcode: 'AB10 1AA',
    postTown: 'Aberdeen',
    addons: 'Engine Bay (£15.00)',
    addonsCount: 1,
    addonsTotal: '15.00',
    originalPrice: '95.00',
    discountAmount: '10.00',
    promotionTitle: 'AUTUMN10',
    finalPrice: '85.00',
    platformFee: '12.75',
    vendorPayout: '72.25',
    stripePaymentIntentId: 'pi_1001',
    transactionReference: 'tx_1001',
    rating: 5,
  };

  it('builds a valid multi-sheet Excel workbook with sanitized cells and numeric currency formatting', async () => {
    const buffer = await buildBookingsExcelBuffer(
      sampleAnalytics,
      [sampleRow],
      'bookingReference,customerName,finalPrice,vendorPayout',
    );

    expect(buffer.subarray(0, 2).toString('utf8')).toBe('PK');

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);

    expect(wb.worksheets.map((s) => s.name)).toEqual([
      'Executive Summary',
      'Bookings',
      'Vendor Performance',
      'Trend',
    ]);

    const bookingsSheet = wb.getWorksheet('Bookings')!;
    expect(bookingsSheet.getRow(1).values).toEqual([
      undefined,
      'Booking Reference',
      'Customer Name',
      'Final Price (£)',
      'Vendor Payout (£)',
    ]);
    expect(bookingsSheet.getRow(2).getCell(1).value).toBe('NX-1001');
    expect(bookingsSheet.getRow(2).getCell(2).value).toBe('\'=CMD("calc")');
    expect(bookingsSheet.getRow(2).getCell(3).value).toBe(85);
    expect(bookingsSheet.getRow(2).getCell(4).value).toBe(72.25);
  });

  it('builds a valid vendors Excel workbook', async () => {
    const buffer = await buildVendorsExcelBuffer(
      sampleAnalytics.vendorPerformance,
      sampleAnalytics.filters,
    );

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    expect(wb.worksheets.map((s) => s.name)).toEqual([
      'Report Info',
      'Vendor Performance',
    ]);
    const sheet = wb.getWorksheet('Vendor Performance')!;
    expect(sheet.getRow(1).getCell(3).value).toBe('Company Name');
    expect(sheet.getRow(2).getCell(3).value).toBe('Aberdeen Shine');
  });
});
