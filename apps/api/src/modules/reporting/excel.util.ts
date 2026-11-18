import * as ExcelJS from 'exceljs';
import type {
  BookingReportRow,
  ReportingAnalyticsResponse,
  VendorPerformanceRow,
} from '@nexa/shared';
import {
  resolveBookingCsvColumns,
  sanitizeSpreadsheetText,
  type CsvColumn,
} from './csv.util';

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF0B192C' },
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: 'FF66FFD1' },
  size: 11,
};

const SECTION_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFE2F5EE' },
};

const ZEBRA_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF8FAFC' },
};

const CURRENCY_KEYS = new Set([
  'addonsTotal',
  'originalPrice',
  'discountAmount',
  'finalPrice',
  'platformFee',
  'vendorPayout',
]);

const INTEGER_KEYS = new Set(['addonsCount', 'rating']);

function styleHeaderRow(row: ExcelJS.Row): void {
  row.height = 24;
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF1E293B' } },
    };
  });
}

function cellValueToText(val: ExcelJS.CellValue): string {
  if (val === null || val === undefined) return '';
  if (
    typeof val === 'string' ||
    typeof val === 'number' ||
    typeof val === 'boolean'
  ) {
    return String(val);
  }
  if (val instanceof Date) return val.toISOString();
  if (
    typeof val === 'object' &&
    'text' in val &&
    typeof val.text === 'string'
  ) {
    return val.text;
  }
  return '';
}

function autoFitColumns(
  sheet: ExcelJS.Worksheet,
  minWidth = 12,
  maxWidth = 42,
): void {
  sheet.columns.forEach((col) => {
    let longest = minWidth;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const str = cellValueToText(cell.value);
      if (str.length + 3 > longest) {
        longest = str.length + 3;
      }
    });
    col.width = Math.min(maxWidth, Math.max(minWidth, longest));
  });
}

function toSafeExcelCellValue(
  key: string,
  raw: unknown,
): string | number | null {
  if (raw === null || raw === undefined || raw === '') return '';
  if (CURRENCY_KEYS.has(key) || INTEGER_KEYS.has(key)) {
    const num =
      typeof raw === 'number' ? raw : parseFloat(sanitizeSpreadsheetText(raw));
    if (!Number.isNaN(num)) return num;
  }
  return sanitizeSpreadsheetText(raw);
}

function buildFilterSummaryEntries(
  filters: ReportingAnalyticsResponse['filters'],
): Array<[string, string]> {
  return [
    ['From Date', filters.startDate ?? 'All'],
    ['To Date', filters.endDate ?? 'All'],
    [
      'Date Basis',
      filters.dateField === 'createdOn' ? 'Booked On' : 'Service Date & Time',
    ],
    ['Trend Grouping', filters.groupBy],
    ['Booking Status', filters.status ?? 'All'],
    ['Payment Status', filters.paymentStatus ?? 'All'],
    ['Service Tier', filters.serviceType ?? 'All'],
    ['Vendor ID', filters.vendorId ?? 'All'],
    ['Postcode Prefix', filters.postcode ?? 'All'],
    ['Search Query', filters.search ?? 'None'],
  ];
}

function populateBookingsSheet(
  workbook: ExcelJS.Workbook,
  rows: BookingReportRow[],
  columns: CsvColumn<BookingReportRow>[],
): void {
  const sheet = workbook.addWorksheet('Bookings', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheet.columns = columns.map((col) => ({
    header: col.label,
    key: col.key,
    width: 18,
  }));

  styleHeaderRow(sheet.getRow(1));

  rows.forEach((row, index) => {
    const record: Record<string, string | number | null> = {};
    for (const col of columns) {
      record[col.key] = toSafeExcelCellValue(col.key, col.getValue(row));
    }
    const added = sheet.addRow(record);
    if (index % 2 === 1) {
      added.eachCell((cell) => {
        cell.fill = ZEBRA_FILL;
      });
    }
    for (const col of columns) {
      if (CURRENCY_KEYS.has(col.key)) {
        const cell = added.getCell(col.key);
        if (typeof cell.value === 'number') {
          cell.numFmt = '£#,##0.00';
          cell.alignment = { horizontal: 'right' };
        }
      } else if (INTEGER_KEYS.has(col.key)) {
        const cell = added.getCell(col.key);
        if (typeof cell.value === 'number') {
          cell.numFmt = '0';
          cell.alignment = { horizontal: 'right' };
        }
      }
    }
  });

  if (columns.length > 0) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: Math.max(1, rows.length + 1), column: columns.length },
    };
  }

  autoFitColumns(sheet);
}

function populateVendorsSheet(
  workbook: ExcelJS.Workbook,
  vendors: VendorPerformanceRow[],
): void {
  const sheet = workbook.addWorksheet('Vendor Performance', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheet.columns = [
    { header: 'Vendor ID', key: 'vendorId', width: 36 },
    { header: 'Vendor Name', key: 'vendorName', width: 22 },
    { header: 'Company Name', key: 'companyName', width: 24 },
    { header: 'Approval Status', key: 'approvalStatus', width: 16 },
    { header: 'Assigned Bookings', key: 'assignedBookings', width: 16 },
    { header: 'Completed Bookings', key: 'completedBookings', width: 18 },
    { header: 'Cancelled Bookings', key: 'cancelledBookings', width: 18 },
    { header: 'Completion Rate (%)', key: 'completionRate', width: 18 },
    { header: 'Total Revenue (£)', key: 'totalRevenue', width: 18 },
    { header: 'Vendor Payout (£)', key: 'vendorPayout', width: 18 },
    { header: 'Platform Fee (£)', key: 'platformFee', width: 18 },
    { header: 'Average Rating', key: 'averageRating', width: 15 },
    { header: 'Review Count', key: 'reviewCount', width: 14 },
  ];

  styleHeaderRow(sheet.getRow(1));

  vendors.forEach((v, index) => {
    const added = sheet.addRow({
      vendorId: v.vendorId,
      vendorName: sanitizeSpreadsheetText(v.vendorName),
      companyName: sanitizeSpreadsheetText(v.companyName ?? ''),
      approvalStatus: v.approvalStatus,
      assignedBookings: v.assignedBookings,
      completedBookings: v.completedBookings,
      cancelledBookings: v.cancelledBookings,
      completionRate: v.completionRate,
      totalRevenue: v.totalRevenue,
      vendorPayout: v.vendorPayout,
      platformFee: v.platformFee,
      averageRating: v.averageRating ?? '',
      reviewCount: v.reviewCount,
    });

    if (index % 2 === 1) {
      added.eachCell((cell) => {
        cell.fill = ZEBRA_FILL;
      });
    }

    ['totalRevenue', 'vendorPayout', 'platformFee'].forEach((k) => {
      added.getCell(k).numFmt = '£#,##0.00';
      added.getCell(k).alignment = { horizontal: 'right' };
    });
    added.getCell('completionRate').numFmt = '0.0';
    if (typeof added.getCell('averageRating').value === 'number') {
      added.getCell('averageRating').numFmt = '0.00';
    }
  });

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, vendors.length + 1), column: 13 },
  };
  autoFitColumns(sheet);
}

/**
 * Generates a multi-sheet styled Excel (.xlsx) workbook containing Executive Summary,
 * filtered Bookings, Vendor Performance, and Time-Series Trend sheets.
 */
export async function buildBookingsExcelBuffer(
  analytics: Omit<ReportingAnalyticsResponse, 'bookings'>,
  bookingRows: BookingReportRow[],
  columnsParam?: string,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Nexa Operations Platform';
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet('Executive Summary');
  const titleRow = summarySheet.addRow([
    'NEXA — Booking & Commercial Analytics Report',
  ]);
  titleRow.font = { bold: true, size: 15, color: { argb: 'FF0B192C' } };
  summarySheet.addRow(['Generated On (UTC)', new Date().toISOString()]);
  summarySheet.addRow(['Matching Bookings', bookingRows.length]);
  summarySheet.addRow([]);

  const filterHeader = summarySheet.addRow(['Applied Filters', 'Value']);
  styleHeaderRow(filterHeader);
  for (const [label, val] of buildFilterSummaryEntries(analytics.filters)) {
    summarySheet.addRow([label, sanitizeSpreadsheetText(val)]);
  }
  summarySheet.addRow([]);

  const kpiHeader = summarySheet.addRow(['KPI Metric', 'Value']);
  styleHeaderRow(kpiHeader);
  const kpiRows: Array<{
    label: string;
    value: number | string;
    fmt?: string;
  }> = [
    {
      label: 'Net Revenue (Confirmed Paid)',
      value: analytics.kpis.netRevenue,
      fmt: '£#,##0.00',
    },
    {
      label: 'Gross Revenue (incl. Refunded)',
      value: analytics.kpis.grossRevenue,
      fmt: '£#,##0.00',
    },
    {
      label: 'Platform Fees',
      value: analytics.kpis.platformFees,
      fmt: '£#,##0.00',
    },
    {
      label: 'Vendor Payouts',
      value: analytics.kpis.vendorPayouts,
      fmt: '£#,##0.00',
    },
    {
      label: 'Total Discounts Applied',
      value: analytics.kpis.totalDiscounts,
      fmt: '£#,##0.00',
    },
    {
      label: 'Refunded Amount',
      value: analytics.kpis.refundedAmount,
      fmt: '£#,##0.00',
    },
    {
      label: 'Average Order Value',
      value: analytics.kpis.averageOrderValue,
      fmt: '£#,##0.00',
    },
    { label: 'Total Bookings', value: analytics.kpis.totalBookings },
    {
      label: 'Confirmed Paid Bookings',
      value: analytics.kpis.confirmedPaidBookings,
    },
    { label: 'Completed Bookings', value: analytics.kpis.completedBookings },
    { label: 'Cancelled Bookings', value: analytics.kpis.cancelledBookings },
    { label: 'Unpaid Bookings', value: analytics.kpis.unpaidBookings },
    { label: 'Refunded Bookings', value: analytics.kpis.refundedBookings },
    {
      label: 'Completion Rate (%)',
      value: analytics.kpis.completionRate,
      fmt: '0.0',
    },
    {
      label: 'Cancellation Rate (%)',
      value: analytics.kpis.cancellationRate,
      fmt: '0.0',
    },
    {
      label: 'Average Rating',
      value:
        analytics.kpis.averageRating !== null
          ? analytics.kpis.averageRating
          : 'N/A',
      fmt: analytics.kpis.averageRating !== null ? '0.00' : undefined,
    },
    { label: 'Total Reviews', value: analytics.kpis.totalReviews },
    {
      label: 'Repeat Customers',
      value: analytics.customers.repeatCustomers,
    },
    { label: 'New Customers', value: analytics.customers.newCustomers },
    {
      label: 'Corporate Fleet Enquiries',
      value: analytics.corporate.totalEnquiries,
    },
    {
      label: 'Corporate Fleet Vehicles Requested',
      value: analytics.corporate.totalFleetVehiclesRequested,
    },
  ];

  for (const item of kpiRows) {
    const r = summarySheet.addRow([item.label, item.value]);
    if (item.fmt && typeof item.value === 'number') {
      r.getCell(2).numFmt = item.fmt;
    }
  }
  summarySheet.addRow([]);

  const addBreakdownSection = (
    title: string,
    items: ReportingAnalyticsResponse['byServiceType'],
  ) => {
    const secRow = summarySheet.addRow([
      title,
      'Count',
      'Share (%)',
      'Revenue (£)',
    ]);
    secRow.eachCell((cell) => {
      cell.fill = SECTION_FILL;
      cell.font = { bold: true, color: { argb: 'FF0B192C' } };
    });
    for (const item of items) {
      const r = summarySheet.addRow([
        item.label,
        item.count,
        item.percentage,
        item.revenue,
      ]);
      r.getCell(3).numFmt = '0.0';
      r.getCell(4).numFmt = '£#,##0.00';
    }
    summarySheet.addRow([]);
  };

  addBreakdownSection('Service Tier Breakdown', analytics.byServiceType);
  addBreakdownSection('Booking Status Breakdown', analytics.byStatus);
  addBreakdownSection('Payment Status Breakdown', analytics.byPaymentStatus);

  autoFitColumns(summarySheet, 18, 48);

  const columns = resolveBookingCsvColumns(columnsParam);
  populateBookingsSheet(workbook, bookingRows, columns);
  populateVendorsSheet(workbook, analytics.vendorPerformance);

  const trendSheet = workbook.addWorksheet('Trend', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  trendSheet.columns = [
    { header: 'Period', key: 'period', width: 16 },
    { header: 'Label', key: 'label', width: 18 },
    { header: 'Bookings', key: 'bookingsCount', width: 14 },
    { header: 'Paid Bookings', key: 'paidCount', width: 14 },
    { header: 'Cancelled', key: 'cancelledCount', width: 14 },
    { header: 'Revenue (£)', key: 'revenue', width: 16 },
    { header: 'Platform Fees (£)', key: 'platformFees', width: 18 },
    { header: 'Vendor Payouts (£)', key: 'vendorPayouts', width: 18 },
  ];
  styleHeaderRow(trendSheet.getRow(1));
  for (const point of analytics.timeseries) {
    const r = trendSheet.addRow(point);
    ['revenue', 'platformFees', 'vendorPayouts'].forEach((k) => {
      r.getCell(k).numFmt = '£#,##0.00';
    });
  }
  autoFitColumns(trendSheet);

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Generates an Excel (.xlsx) workbook for Vendor Performance metrics.
 */
export async function buildVendorsExcelBuffer(
  vendors: VendorPerformanceRow[],
  filters: ReportingAnalyticsResponse['filters'],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Nexa Operations Platform';
  workbook.created = new Date();

  const filterSheet = workbook.addWorksheet('Report Info');
  const title = filterSheet.addRow(['NEXA — Vendor Performance Report']);
  title.font = { bold: true, size: 14, color: { argb: 'FF0B192C' } };
  filterSheet.addRow(['Generated On (UTC)', new Date().toISOString()]);
  filterSheet.addRow(['Vendor Count', vendors.length]);
  filterSheet.addRow([]);
  const hdr = filterSheet.addRow(['Applied Filters', 'Value']);
  styleHeaderRow(hdr);
  for (const [label, val] of buildFilterSummaryEntries(filters)) {
    filterSheet.addRow([label, sanitizeSpreadsheetText(val)]);
  }
  autoFitColumns(filterSheet, 18, 44);

  populateVendorsSheet(workbook, vendors);

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
