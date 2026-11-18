import {
  BOOKING_CSV_COLUMN_DEFINITIONS,
  type BookingCsvColumnKey,
  type BookingReportRow,
  type VendorPerformanceRow,
} from '@nexa/shared';

const FORMULA_PREFIX_REGEX = /^[=+\-@\t\r]/;
const STRICT_NEGATIVE_NUMBER_REGEX = /^-\d+(\.\d+)?$/;

/**
 * Converts any cell value to a string and neutralizes spreadsheet formula
 * injection (CWE-1236) while keeping valid negative numbers unprefixed.
 */
export function sanitizeSpreadsheetText(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  let str: string;
  if (value instanceof Date) {
    str = value.toISOString();
  } else if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    str = String(value);
  } else {
    str = JSON.stringify(value) ?? '';
  }

  if (
    FORMULA_PREFIX_REGEX.test(str) &&
    !STRICT_NEGATIVE_NUMBER_REGEX.test(str)
  ) {
    return `'${str}`;
  }

  return str;
}

/**
 * Neutralizes spreadsheet formula injection (CWE-1236) and applies RFC 4180
 * CSV quoting when needed.
 */
export function escapeCsvCell(value: unknown): string {
  const str = sanitizeSpreadsheetText(value);

  if (
    str.includes('"') ||
    str.includes(',') ||
    str.includes('\n') ||
    str.includes('\r')
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

export interface CsvColumn<T> {
  key: string;
  label: string;
  getValue: (row: T) => unknown;
}

const BOOKING_COLUMN_MAP: Record<
  BookingCsvColumnKey,
  { label: string; getValue: (row: BookingReportRow) => unknown }
> = {
  bookingReference: {
    label: 'Booking Reference',
    getValue: (r) => r.bookingReference,
  },
  bookingId: { label: 'Booking ID', getValue: (r) => r.bookingId },
  createdAt: { label: 'Booked On (UTC)', getValue: (r) => r.createdAt },
  bookingTime: {
    label: 'Service Date & Time (UTC)',
    getValue: (r) => r.bookingTime,
  },
  status: { label: 'Booking Status', getValue: (r) => r.status },
  paymentStatus: { label: 'Payment Status', getValue: (r) => r.paymentStatus },
  serviceType: { label: 'Service Tier', getValue: (r) => r.serviceType },
  vehicleType: { label: 'Vehicle Category', getValue: (r) => r.vehicleType },
  vehicleSummary: { label: 'Vehicle', getValue: (r) => r.vehicleSummary },
  registrationNumber: {
    label: 'Registration',
    getValue: (r) => r.registrationNumber,
  },
  customerName: { label: 'Customer Name', getValue: (r) => r.customerName },
  customerEmail: { label: 'Customer Email', getValue: (r) => r.customerEmail },
  customerPhone: { label: 'Customer Phone', getValue: (r) => r.customerPhone },
  vendorName: { label: 'Detailer / Vendor', getValue: (r) => r.vendorName },
  vendorCompany: { label: 'Vendor Company', getValue: (r) => r.vendorCompany },
  serviceAddress: {
    label: 'Service Address',
    getValue: (r) => r.serviceAddress,
  },
  postcode: { label: 'Postcode', getValue: (r) => r.postcode },
  postTown: { label: 'Post Town', getValue: (r) => r.postTown },
  addons: { label: 'Add-ons', getValue: (r) => r.addons },
  addonsCount: { label: 'Add-ons Count', getValue: (r) => r.addonsCount },
  addonsTotal: { label: 'Add-ons Total (£)', getValue: (r) => r.addonsTotal },
  originalPrice: {
    label: 'Original Price (£)',
    getValue: (r) => r.originalPrice,
  },
  discountAmount: { label: 'Discount (£)', getValue: (r) => r.discountAmount },
  promotionTitle: { label: 'Promotion', getValue: (r) => r.promotionTitle },
  finalPrice: { label: 'Final Price (£)', getValue: (r) => r.finalPrice },
  platformFee: { label: 'Platform Fee (£)', getValue: (r) => r.platformFee },
  vendorPayout: { label: 'Vendor Payout (£)', getValue: (r) => r.vendorPayout },
  stripePaymentIntentId: {
    label: 'Stripe Payment Intent',
    getValue: (r) => r.stripePaymentIntentId,
  },
  transactionReference: {
    label: 'Transaction Reference',
    getValue: (r) => r.transactionReference,
  },
  rating: { label: 'Customer Rating', getValue: (r) => r.rating ?? '' },
};

const VALID_BOOKING_COLUMN_KEYS = new Set<string>(
  BOOKING_CSV_COLUMN_DEFINITIONS.map((c) => c.key),
);

export function resolveBookingCsvColumns(
  columnsParam?: string,
): CsvColumn<BookingReportRow>[] {
  const keys: BookingCsvColumnKey[] = columnsParam
    ? columnsParam
        .split(',')
        .map((k) => k.trim())
        .filter((k): k is BookingCsvColumnKey =>
          VALID_BOOKING_COLUMN_KEYS.has(k),
        )
    : BOOKING_CSV_COLUMN_DEFINITIONS.map((c) => c.key);

  const effectiveKeys =
    keys.length > 0 ? keys : BOOKING_CSV_COLUMN_DEFINITIONS.map((c) => c.key);

  return effectiveKeys.map((key) => ({
    key,
    label: BOOKING_COLUMN_MAP[key].label,
    getValue: BOOKING_COLUMN_MAP[key].getValue,
  }));
}

export const VENDOR_CSV_COLUMNS: CsvColumn<VendorPerformanceRow>[] = [
  { key: 'vendorId', label: 'Vendor ID', getValue: (r) => r.vendorId },
  { key: 'vendorName', label: 'Vendor Name', getValue: (r) => r.vendorName },
  {
    key: 'companyName',
    label: 'Company Name',
    getValue: (r) => r.companyName ?? '',
  },
  {
    key: 'approvalStatus',
    label: 'Approval Status',
    getValue: (r) => r.approvalStatus,
  },
  {
    key: 'assignedBookings',
    label: 'Assigned Bookings',
    getValue: (r) => r.assignedBookings,
  },
  {
    key: 'completedBookings',
    label: 'Completed Bookings',
    getValue: (r) => r.completedBookings,
  },
  {
    key: 'cancelledBookings',
    label: 'Cancelled Bookings',
    getValue: (r) => r.cancelledBookings,
  },
  {
    key: 'completionRate',
    label: 'Completion Rate (%)',
    getValue: (r) => r.completionRate.toFixed(1),
  },
  {
    key: 'totalRevenue',
    label: 'Total Revenue (£)',
    getValue: (r) => r.totalRevenue.toFixed(2),
  },
  {
    key: 'vendorPayout',
    label: 'Vendor Payout (£)',
    getValue: (r) => r.vendorPayout.toFixed(2),
  },
  {
    key: 'platformFee',
    label: 'Platform Fee (£)',
    getValue: (r) => r.platformFee.toFixed(2),
  },
  {
    key: 'averageRating',
    label: 'Average Rating',
    getValue: (r) =>
      r.averageRating !== null ? r.averageRating.toFixed(2) : '',
  },
  {
    key: 'reviewCount',
    label: 'Review Count',
    getValue: (r) => r.reviewCount,
  },
];

/**
 * Serializes rows into a UTF-8 BOM prefixed RFC 4180 CSV string with CRLF line endings.
 */
export function buildCsvString<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCsvCell(c.label)).join(',');
  const lines = rows.map((row) =>
    columns.map((col) => escapeCsvCell(col.getValue(row))).join(','),
  );
  return `\uFEFF${[header, ...lines].join('\r\n')}`;
}
