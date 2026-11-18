import { BookingStatus, PaymentStatus, ServiceType } from '@nexa/shared';
import type { BookingReportRow, VendorPerformanceRow } from '@nexa/shared';
import {
  buildCsvString,
  escapeCsvCell,
  resolveBookingCsvColumns,
  VENDOR_CSV_COLUMNS,
} from './csv.util';

describe('csv.util', () => {
  describe('escapeCsvCell', () => {
    it('returns empty string for null or undefined', () => {
      expect(escapeCsvCell(null)).toBe('');
      expect(escapeCsvCell(undefined)).toBe('');
    });

    it('quotes cells containing commas, double quotes, or newlines', () => {
      expect(escapeCsvCell('12 Union St, Aberdeen')).toBe(
        '"12 Union St, Aberdeen"',
      );
      expect(escapeCsvCell('Say "Hello"')).toBe('"Say ""Hello"""');
      expect(escapeCsvCell('Line1\nLine2')).toBe('"Line1\nLine2"');
    });

    it('neutralizes spreadsheet formula injection attempts', () => {
      expect(escapeCsvCell('=CMD("calc")')).toBe('"\'=CMD(""calc"")"');
      expect(escapeCsvCell('=1+1')).toBe("'=1+1");
      expect(escapeCsvCell('+SUM(A1:A2)')).toBe("'+SUM(A1:A2)");
      expect(escapeCsvCell('@IMPORTXML()')).toBe("'@IMPORTXML()");
      expect(escapeCsvCell('-cmd|/C calc')).toBe("'-cmd|/C calc");
      expect(escapeCsvCell('\t=1+1')).toBe("'\t=1+1");
    });

    it('keeps valid negative numeric values unprefixed', () => {
      expect(escapeCsvCell('-15.50')).toBe('-15.50');
      expect(escapeCsvCell(-42)).toBe('-42');
    });
  });

  describe('resolveBookingCsvColumns', () => {
    it('returns all columns when no columns filter is provided', () => {
      const cols = resolveBookingCsvColumns();
      expect(cols.length).toBeGreaterThan(20);
      expect(cols[0].key).toBe('bookingReference');
    });

    it('filters to valid requested columns in requested order', () => {
      const cols = resolveBookingCsvColumns(
        'bookingReference,finalPrice,invalidCol,customerName',
      );
      expect(cols.map((c) => c.key)).toEqual([
        'bookingReference',
        'finalPrice',
        'customerName',
      ]);
    });

    it('falls back to all columns if all requested keys are invalid', () => {
      const cols = resolveBookingCsvColumns('foo,bar');
      expect(cols.length).toBeGreaterThan(20);
    });
  });

  describe('buildCsvString', () => {
    const sampleBooking: BookingReportRow = {
      bookingId: 'b-1',
      bookingReference: 'NX-1001',
      createdAt: '2026-11-10T10:00:00.000Z',
      bookingTime: '2026-11-12T14:00:00.000Z',
      status: BookingStatus.COMPLETED,
      paymentStatus: PaymentStatus.CAPTURED,
      serviceType: ServiceType.FULL,
      vehicleType: 'medium',
      vehicleSummary: 'BMW 3 Series (AB12 CDE)',
      registrationNumber: 'AB12 CDE',
      customerName: '=HYPERLINK("http://evil")',
      customerEmail: 'jane@example.com',
      customerPhone: '+447700900123',
      vendorId: 'v-1',
      vendorName: 'Alex Detailer',
      vendorCompany: 'Sparkle Ltd',
      serviceAddress: '10 King St, Aberdeen',
      postcode: 'AB10 1AA',
      postTown: 'Aberdeen',
      addons: 'Engine Bay (£15.00)',
      addonsCount: 1,
      addonsTotal: '15.00',
      originalPrice: '85.00',
      discountAmount: '10.00',
      promotionTitle: 'Winter10',
      finalPrice: '75.00',
      platformFee: '11.25',
      vendorPayout: '63.75',
      stripePaymentIntentId: 'pi_123',
      transactionReference: 'tx_123',
      rating: 5,
    };

    it('generates UTF-8 BOM, CRLF lines, headers, and escaped rows', () => {
      const cols = resolveBookingCsvColumns(
        'bookingReference,customerName,serviceAddress,finalPrice',
      );
      const csv = buildCsvString([sampleBooking], cols);

      expect(csv.startsWith('\uFEFF')).toBe(true);
      const lines = csv.slice(1).split('\r\n');
      expect(lines).toHaveLength(2);
      expect(lines[0]).toBe(
        'Booking Reference,Customer Name,Service Address,Final Price (£)',
      );
      expect(lines[1]).toBe(
        'NX-1001,"\'=HYPERLINK(""http://evil"")","10 King St, Aberdeen",75.00',
      );
    });

    it('formats vendor performance CSV rows cleanly', () => {
      const vendorRow: VendorPerformanceRow = {
        vendorId: 'v-1',
        vendorName: 'Alex Detailer',
        companyName: 'Sparkle Ltd',
        approvalStatus: 'ACTIVE',
        assignedBookings: 10,
        completedBookings: 9,
        cancelledBookings: 1,
        completionRate: 90,
        totalRevenue: 750,
        vendorPayout: 637.5,
        platformFee: 112.5,
        averageRating: 4.85,
        reviewCount: 6,
      };
      const csv = buildCsvString([vendorRow], VENDOR_CSV_COLUMNS);
      const lines = csv.slice(1).split('\r\n');
      expect(lines).toHaveLength(2);
      expect(lines[1]).toContain('Sparkle Ltd');
      expect(lines[1]).toContain('90.0');
      expect(lines[1]).toContain('750.00');
      expect(lines[1]).toContain('4.85');
    });
  });
});
