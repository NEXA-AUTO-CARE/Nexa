import PDFDocument from 'pdfkit';
import type {
  BookingCsvColumnKey,
  BookingReportRow,
  ReportingAnalyticsResponse,
} from '@nexa/shared';
import { resolveBookingCsvColumns } from './csv.util';

const NAVY = '#0B192C';
const SLATE = '#1E293B';
const MUTED = '#64748B';
const BORDER = '#CBD5E1';
const LIGHT_BG = '#F8FAFC';
const MINT = '#10B981';
const MINT_BRIGHT = '#66FFD1';

const DEFAULT_PDF_BOOKING_COLUMNS: BookingCsvColumnKey[] = [
  'bookingReference',
  'bookingTime',
  'customerName',
  'vehicleSummary',
  'serviceType',
  'postcode',
  'vendorName',
  'status',
  'paymentStatus',
  'finalPrice',
  'vendorPayout',
];

function formatCurrency(val: number | string): string {
  const n = typeof val === 'number' ? val : parseFloat(val || '0');
  return `£${(Number.isNaN(n) ? 0 : n).toFixed(2)}`;
}

function stringifyPdfCell(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  if (
    typeof raw === 'string' ||
    typeof raw === 'number' ||
    typeof raw === 'boolean' ||
    typeof raw === 'bigint'
  ) {
    return String(raw);
  }
  if (raw instanceof Date) return raw.toISOString();
  return JSON.stringify(raw) ?? '';
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

interface PdfTableCol<T> {
  header: string;
  weight: number;
  align?: 'left' | 'right';
  getValue: (row: T) => string;
}

function drawSectionHeading(
  doc: PDFKit.PDFDocument,
  title: string,
  margin: number,
  contentWidth: number,
): void {
  if (doc.y > doc.page.height - 90) {
    doc.addPage();
  }
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor(NAVY)
    .text(title, margin, doc.y);
  const lineY = doc.y + 3;
  doc
    .moveTo(margin, lineY)
    .lineTo(margin + contentWidth, lineY)
    .lineWidth(1)
    .strokeColor(MINT)
    .stroke();
  doc.y = lineY + 8;
}

function drawTable<T>(
  doc: PDFKit.PDFDocument,
  rows: T[],
  cols: PdfTableCol<T>[],
  margin: number,
  contentWidth: number,
  emptyMessage: string,
): void {
  if (rows.length === 0) {
    doc
      .font('Helvetica-Oblique')
      .fontSize(9)
      .fillColor(MUTED)
      .text(emptyMessage, margin, doc.y);
    doc.moveDown(0.8);
    return;
  }

  const totalWeight = cols.reduce((sum, c) => sum + c.weight, 0);
  const widths = cols.map((c) => (c.weight / totalWeight) * contentWidth);
  const headerHeight = 20;
  const rowHeight = 18;
  const bottomLimit = doc.page.height - margin - 24;

  const drawHeader = (y: number) => {
    doc.rect(margin, y, contentWidth, headerHeight).fill(NAVY);
    let x = margin;
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(MINT_BRIGHT);
    cols.forEach((col, i) => {
      doc.text(col.header, x + 4, y + 6, {
        width: widths[i] - 8,
        align: col.align ?? 'left',
        lineBreak: false,
        ellipsis: true,
      });
      x += widths[i];
    });
    return y + headerHeight;
  };

  if (doc.y + headerHeight + rowHeight > bottomLimit) {
    doc.addPage();
  }

  let currentY = drawHeader(doc.y);

  rows.forEach((row, idx) => {
    if (currentY + rowHeight > bottomLimit) {
      doc.addPage();
      currentY = drawHeader(margin);
    }

    if (idx % 2 === 1) {
      doc.rect(margin, currentY, contentWidth, rowHeight).fill(LIGHT_BG);
    }

    doc
      .moveTo(margin, currentY + rowHeight)
      .lineTo(margin + contentWidth, currentY + rowHeight)
      .lineWidth(0.4)
      .strokeColor(BORDER)
      .stroke();

    let x = margin;
    doc.font('Helvetica').fontSize(7.5).fillColor(SLATE);
    cols.forEach((col, i) => {
      doc.text(col.getValue(row), x + 4, currentY + 5, {
        width: widths[i] - 8,
        align: col.align ?? 'left',
        lineBreak: false,
        ellipsis: true,
      });
      x += widths[i];
    });

    currentY += rowHeight;
  });

  doc.y = currentY + 12;
}

function buildFilterPills(
  filters: ReportingAnalyticsResponse['filters'],
): string[] {
  const parts: string[] = [];
  if (filters.startDate || filters.endDate) {
    parts.push(
      `Dates: ${filters.startDate ?? '...'} to ${filters.endDate ?? '...'}`,
    );
  } else {
    parts.push('Dates: All Time');
  }
  parts.push(
    `Date Basis: ${filters.dateField === 'createdOn' ? 'Booked On' : 'Service Date'}`,
  );
  parts.push(`Grouping: ${filters.groupBy}`);
  if (filters.status) parts.push(`Status: ${filters.status}`);
  if (filters.paymentStatus) parts.push(`Payment: ${filters.paymentStatus}`);
  if (filters.serviceType) parts.push(`Tier: ${filters.serviceType}`);
  if (filters.vendorId) parts.push(`Vendor ID: ${filters.vendorId}`);
  if (filters.postcode) parts.push(`Postcode: ${filters.postcode}`);
  if (filters.search) parts.push(`Search: "${filters.search}"`);
  return parts;
}

/**
 * Generates a multi-page landscape A4 PDF report containing applied filters,
 * executive KPIs, breakdowns, vendor leaderboard, and filtered booking rows.
 */
export async function buildReportPdfBuffer(
  analytics: Omit<ReportingAnalyticsResponse, 'bookings'>,
  bookingRows: BookingReportRow[],
  columnsParam?: string,
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const margin = 36;
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin,
      bufferPages: true,
      info: {
        Title: 'Nexa Analytics & Booking Report',
        Author: 'Nexa Operations Platform',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const contentWidth = doc.page.width - margin * 2;

    // Header Banner
    doc.rect(margin, margin, contentWidth, 54).fill(NAVY);
    doc.rect(margin, margin, 6, 54).fill(MINT);
    doc
      .font('Helvetica-Bold')
      .fontSize(17)
      .fillColor('#FFFFFF')
      .text('NEXA — Analytics & Booking Report', margin + 18, margin + 11);
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(MINT_BRIGHT)
      .text(
        `Generated ${new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC  |  Matching Bookings: ${bookingRows.length}`,
        margin + 18,
        margin + 33,
      );

    doc.y = margin + 64;

    // Applied Filters Summary
    const filterText = buildFilterPills(analytics.filters).join('   •   ');
    doc.rect(margin, doc.y, contentWidth, 24).fill(LIGHT_BG);
    doc
      .rect(margin, doc.y, contentWidth, 24)
      .lineWidth(0.5)
      .strokeColor(BORDER)
      .stroke();
    doc
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor(NAVY)
      .text('Active Filters: ', margin + 8, doc.y + 8, { continued: true })
      .font('Helvetica')
      .fillColor(SLATE)
      .text(filterText, { width: contentWidth - 16, ellipsis: true });

    doc.y += 34;

    // Executive KPI Cards (2 rows x 4 cols)
    drawSectionHeading(doc, 'Executive KPI Summary', margin, contentWidth);
    const kpis = analytics.kpis;
    const cards = [
      {
        label: 'NET REVENUE',
        value: formatCurrency(kpis.netRevenue),
        sub: `Gross ${formatCurrency(kpis.grossRevenue)}`,
      },
      {
        label: 'PLATFORM FEES',
        value: formatCurrency(kpis.platformFees),
        sub: `Vendor Payouts ${formatCurrency(kpis.vendorPayouts)}`,
      },
      {
        label: 'TOTAL BOOKINGS',
        value: String(kpis.totalBookings),
        sub: `${kpis.confirmedPaidBookings} paid · ${kpis.unpaidBookings} unpaid`,
      },
      {
        label: 'AVG ORDER VALUE',
        value: formatCurrency(kpis.averageOrderValue),
        sub: `Discounts ${formatCurrency(kpis.totalDiscounts)}`,
      },
      {
        label: 'COMPLETION RATE',
        value: `${kpis.completionRate.toFixed(1)}%`,
        sub: `${kpis.completedBookings} completed · ${kpis.cancelledBookings} cancelled`,
      },
      {
        label: 'REFUNDS',
        value: formatCurrency(kpis.refundedAmount),
        sub: `${kpis.refundedBookings} refunded booking(s)`,
      },
      {
        label: 'CUSTOMER CSAT',
        value:
          kpis.averageRating !== null
            ? `${kpis.averageRating.toFixed(2)} / 5.0`
            : 'N/A',
        sub: `${kpis.totalReviews} review(s) · ${analytics.customers.repeatCustomers} repeat`,
      },
      {
        label: 'CORPORATE LEADS',
        value: String(analytics.corporate.totalEnquiries),
        sub: `${analytics.corporate.totalFleetVehiclesRequested} fleet vehicles`,
      },
    ];

    const gap = 8;
    const cardW = (contentWidth - gap * 3) / 4;
    const cardH = 44;
    const startY = doc.y;

    cards.forEach((card, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = margin + col * (cardW + gap);
      const y = startY + row * (cardH + gap);

      doc.rect(x, y, cardW, cardH).fill(LIGHT_BG);
      doc.rect(x, y, cardW, cardH).lineWidth(0.5).strokeColor(BORDER).stroke();

      doc
        .font('Helvetica-Bold')
        .fontSize(6.5)
        .fillColor(MUTED)
        .text(card.label, x + 8, y + 6, { width: cardW - 16 });
      doc
        .font('Helvetica-Bold')
        .fontSize(12.5)
        .fillColor(NAVY)
        .text(card.value, x + 8, y + 16, { width: cardW - 16 });
      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor(MUTED)
        .text(card.sub, x + 8, y + 32, {
          width: cardW - 16,
          ellipsis: true,
          lineBreak: false,
        });
    });

    doc.y = startY + cardH * 2 + gap + 14;

    // Breakdowns
    drawSectionHeading(doc, 'Service Tier Breakdown', margin, contentWidth);
    drawTable(
      doc,
      analytics.byServiceType,
      [
        { header: 'Service Tier', weight: 3, getValue: (r) => r.label },
        {
          header: 'Bookings',
          weight: 1,
          align: 'right',
          getValue: (r) => String(r.count),
        },
        {
          header: 'Share',
          weight: 1,
          align: 'right',
          getValue: (r) => `${r.percentage.toFixed(1)}%`,
        },
        {
          header: 'Revenue',
          weight: 1.5,
          align: 'right',
          getValue: (r) => formatCurrency(r.revenue),
        },
      ],
      margin,
      contentWidth,
      'No service tier breakdown available.',
    );

    drawSectionHeading(doc, 'Booking Status Breakdown', margin, contentWidth);
    drawTable(
      doc,
      analytics.byStatus,
      [
        { header: 'Status', weight: 3, getValue: (r) => r.label },
        {
          header: 'Bookings',
          weight: 1,
          align: 'right',
          getValue: (r) => String(r.count),
        },
        {
          header: 'Share',
          weight: 1,
          align: 'right',
          getValue: (r) => `${r.percentage.toFixed(1)}%`,
        },
        {
          header: 'Revenue',
          weight: 1.5,
          align: 'right',
          getValue: (r) => formatCurrency(r.revenue),
        },
      ],
      margin,
      contentWidth,
      'No booking status breakdown available.',
    );

    // Vendor Performance Leaderboard
    drawSectionHeading(
      doc,
      'Vendor Performance Leaderboard',
      margin,
      contentWidth,
    );
    drawTable(
      doc,
      analytics.vendorPerformance,
      [
        {
          header: 'Vendor / Company',
          weight: 2.5,
          getValue: (v) =>
            v.companyName ? `${v.companyName} (${v.vendorName})` : v.vendorName,
        },
        { header: 'Status', weight: 1, getValue: (v) => v.approvalStatus },
        {
          header: 'Assigned',
          weight: 0.9,
          align: 'right',
          getValue: (v) => String(v.assignedBookings),
        },
        {
          header: 'Completed',
          weight: 0.9,
          align: 'right',
          getValue: (v) => String(v.completedBookings),
        },
        {
          header: 'Comp. %',
          weight: 0.9,
          align: 'right',
          getValue: (v) => `${v.completionRate.toFixed(1)}%`,
        },
        {
          header: 'Revenue',
          weight: 1.1,
          align: 'right',
          getValue: (v) => formatCurrency(v.totalRevenue),
        },
        {
          header: 'Payout',
          weight: 1.1,
          align: 'right',
          getValue: (v) => formatCurrency(v.vendorPayout),
        },
        {
          header: 'Rating',
          weight: 1,
          align: 'right',
          getValue: (v) =>
            v.averageRating !== null
              ? `${v.averageRating.toFixed(1)} (${v.reviewCount})`
              : '—',
        },
      ],
      margin,
      contentWidth,
      'No vendor performance data found.',
    );

    // Filtered Bookings Ledger
    const requestedCols = columnsParam
      ? resolveBookingCsvColumns(columnsParam)
      : [];
    const useCustomCols =
      requestedCols.length > 0 && requestedCols.length <= 12;

    const bookingCols: PdfTableCol<BookingReportRow>[] = useCustomCols
      ? requestedCols.map((c) => ({
          header: c.label,
          weight:
            c.key === 'serviceAddress' || c.key === 'vehicleSummary' ? 1.8 : 1,
          align:
            c.key.includes('Price') ||
            c.key.includes('Fee') ||
            c.key.includes('Payout') ||
            c.key === 'addonsTotal' ||
            c.key === 'discountAmount'
              ? 'right'
              : 'left',
          getValue: (r) => {
            const text = stringifyPdfCell(c.getValue(r));
            if (c.key === 'bookingTime' || c.key === 'createdAt') {
              return formatShortDate(text);
            }
            return text;
          },
        }))
      : resolveBookingCsvColumns(DEFAULT_PDF_BOOKING_COLUMNS.join(',')).map(
          (c) => ({
            header: c.label,
            weight:
              c.key === 'vehicleSummary' || c.key === 'customerName' ? 1.5 : 1,
            align:
              c.key === 'finalPrice' || c.key === 'vendorPayout'
                ? 'right'
                : 'left',
            getValue: (r) => {
              const text = stringifyPdfCell(c.getValue(r));
              if (c.key === 'bookingTime') {
                return formatShortDate(text);
              }
              if (c.key === 'finalPrice' || c.key === 'vendorPayout') {
                return formatCurrency(text || '0');
              }
              return text;
            },
          }),
        );

    const ledgerTitle = useCustomCols
      ? `Filtered Bookings (${bookingRows.length})`
      : `Filtered Bookings Ledger (${bookingRows.length} — Key Columns)`;

    drawSectionHeading(doc, ledgerTitle, margin, contentWidth);
    drawTable(
      doc,
      bookingRows,
      bookingCols,
      margin,
      contentWidth,
      'No bookings match the selected filters.',
    );

    // Stamp page numbers in footer
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const footerY = doc.page.height - margin + 10;
      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(MUTED)
        .text('Nexa Control • Confidential Analytics Report', margin, footerY, {
          width: contentWidth / 2,
          lineBreak: false,
        })
        .text(
          `Page ${i + 1} of ${range.count}`,
          margin + contentWidth / 2,
          footerY,
          {
            width: contentWidth / 2,
            align: 'right',
            lineBreak: false,
          },
        );
    }

    doc.end();
  });
}
