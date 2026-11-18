import { BookingStatus, PaymentStatus, ServiceType } from '@nexa/shared';
import type {
  BookingReportRow,
  ReportingAnalyticsResponse,
} from '@nexa/shared';
import { buildReportPdfBuffer } from './pdf.util';

describe('pdf.util', () => {
  const analytics: Omit<ReportingAnalyticsResponse, 'bookings'> = {
    filters: {
      startDate: '2026-11-01',
      endDate: '2026-11-18',
      groupBy: 'day',
      dateField: 'bookingTime',
      status: BookingStatus.COMPLETED,
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
      totalDiscounts: 0,
      refundedAmount: 0,
      platformFees: 12.75,
      vendorPayouts: 72.25,
      averageOrderValue: 85,
      completionRate: 100,
      cancellationRate: 0,
      averageRating: 5,
      totalReviews: 1,
    },
    timeseries: [],
    byStatus: [
      {
        key: 'completed',
        label: 'Completed',
        count: 1,
        revenue: 85,
        percentage: 100,
      },
    ],
    byPaymentStatus: [],
    byServiceType: [
      {
        key: 'full',
        label: 'Full Valet',
        count: 1,
        revenue: 85,
        percentage: 100,
      },
    ],
    byVehicleCategory: [],
    topAddons: [],
    topPostcodes: [],
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
      totalEnquiries: 0,
      newEnquiries: 0,
      invoicedEnquiries: 0,
      totalFleetVehiclesRequested: 0,
    },
    customers: {
      totalCustomersInPeriod: 1,
      repeatCustomers: 0,
      newCustomers: 1,
    },
  };

  const makeRow = (idx: number): BookingReportRow => ({
    bookingId: `b-${idx}`,
    bookingReference: `NX-${1000 + idx}`,
    createdAt: '2026-11-08T10:00:00.000Z',
    bookingTime: '2026-11-10T10:00:00.000Z',
    status: BookingStatus.COMPLETED,
    paymentStatus: PaymentStatus.CAPTURED,
    serviceType: ServiceType.FULL,
    vehicleType: 'medium',
    vehicleSummary: 'Audi A4 (AB21 XYZ)',
    registrationNumber: 'AB21 XYZ',
    customerName: `Customer ${idx}`,
    customerEmail: `c${idx}@example.com`,
    customerPhone: '+447700900001',
    vendorId: 'v-1',
    vendorName: 'Sam Valet',
    vendorCompany: 'Aberdeen Shine',
    serviceAddress: '10 Union Street, Aberdeen',
    postcode: 'AB10 1AA',
    postTown: 'Aberdeen',
    addons: '',
    addonsCount: 0,
    addonsTotal: '0.00',
    originalPrice: '85.00',
    discountAmount: '0.00',
    promotionTitle: '',
    finalPrice: '85.00',
    platformFee: '12.75',
    vendorPayout: '72.25',
    stripePaymentIntentId: 'pi_1',
    transactionReference: 'tx_1',
    rating: 5,
  });

  it('generates a valid PDF buffer for filtered bookings and analytics', async () => {
    const buffer = await buildReportPdfBuffer(analytics, [makeRow(1)]);
    expect(buffer.subarray(0, 5).toString('utf8')).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(1500);
  });

  it('paginates cleanly when booking rows span multiple pages and supports custom columns', async () => {
    const manyRows = Array.from({ length: 45 }, (_, i) => makeRow(i + 1));
    const buffer = await buildReportPdfBuffer(
      analytics,
      manyRows,
      'bookingReference,customerName,finalPrice',
    );
    expect(buffer.subarray(0, 5).toString('utf8')).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(3000);
  });
});
