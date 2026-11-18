import { StreamableFile } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ReportingController } from './reporting.controller';
import { ReportingService } from './reporting.service';

describe('ReportingController', () => {
  let controller: ReportingController;
  let mockReportingService: {
    getAnalytics: jest.Mock;
    getBookingsTable: jest.Mock;
    exportBookingsCsv: jest.Mock;
    exportBookingsExcel: jest.Mock;
    exportBookingsPdf: jest.Mock;
    exportVendorsCsv: jest.Mock;
    exportVendorsExcel: jest.Mock;
  };

  beforeEach(async () => {
    mockReportingService = {
      getAnalytics: jest.fn().mockResolvedValue({ kpis: { totalBookings: 5 } }),
      getBookingsTable: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      exportBookingsCsv: jest.fn().mockResolvedValue({
        csv: '\uFEFFBooking Reference\r\nNX-001',
        filename: 'nexa-bookings-report-2026-11-18.csv',
        rowCount: 1,
      }),
      exportBookingsExcel: jest.fn().mockResolvedValue({
        buffer: Buffer.from('PKexcel'),
        filename: 'nexa-bookings-report-2026-11-18.xlsx',
        rowCount: 2,
      }),
      exportBookingsPdf: jest.fn().mockResolvedValue({
        buffer: Buffer.from('%PDF-1.3'),
        filename: 'nexa-bookings-report-2026-11-18.pdf',
        rowCount: 2,
      }),
      exportVendorsCsv: jest.fn().mockResolvedValue({
        csv: '\uFEFFVendor ID\r\nv-1',
        filename: 'nexa-vendor-performance-2026-11-18.csv',
        rowCount: 1,
      }),
      exportVendorsExcel: jest.fn().mockResolvedValue({
        buffer: Buffer.from('PKvendors'),
        filename: 'nexa-vendor-performance-2026-11-18.xlsx',
        rowCount: 1,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportingController],
      providers: [
        { provide: ReportingService, useValue: mockReportingService },
      ],
    }).compile();

    controller = module.get<ReportingController>(ReportingController);
  });

  it('delegates getAnalytics to ReportingService', async () => {
    const res = await controller.getAnalytics({ groupBy: 'week' });
    expect(res).toEqual({ kpis: { totalBookings: 5 } });
    expect(mockReportingService.getAnalytics).toHaveBeenCalledWith({
      groupBy: 'week',
    });
  });

  it('sets CSV response headers and returns StreamableFile on exportBookingsCsv', async () => {
    const res = { setHeader: jest.fn() } as any;
    const file = await controller.exportBookingsCsv(
      { userId: 'admin-1', role: 'admin' } as any,
      {},
      res,
    );

    expect(file).toBeInstanceOf(StreamableFile);
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'text/csv; charset=utf-8',
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="nexa-bookings-report-2026-11-18.csv"',
    );
    expect(res.setHeader).toHaveBeenCalledWith('X-Report-Row-Count', '1');
  });

  it('sets Excel response headers and returns StreamableFile on exportBookingsExcel', async () => {
    const res = { setHeader: jest.fn() } as any;
    const file = await controller.exportBookingsExcel(
      { userId: 'admin-1', role: 'admin' } as any,
      {},
      res,
    );

    expect(file).toBeInstanceOf(StreamableFile);
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="nexa-bookings-report-2026-11-18.xlsx"',
    );
    expect(res.setHeader).toHaveBeenCalledWith('X-Report-Row-Count', '2');
  });

  it('sets PDF response headers and returns StreamableFile on exportBookingsPdf', async () => {
    const res = { setHeader: jest.fn() } as any;
    const file = await controller.exportBookingsPdf(
      { userId: 'admin-1', role: 'admin' } as any,
      {},
      res,
    );

    expect(file).toBeInstanceOf(StreamableFile);
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/pdf',
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="nexa-bookings-report-2026-11-18.pdf"',
    );
    expect(res.setHeader).toHaveBeenCalledWith('X-Report-Row-Count', '2');
  });

  it('sets CSV response headers and returns StreamableFile on exportVendorsCsv', async () => {
    const res = { setHeader: jest.fn() } as any;
    const file = await controller.exportVendorsCsv(
      { userId: 'admin-1', role: 'admin' } as any,
      {},
      res,
    );

    expect(file).toBeInstanceOf(StreamableFile);
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="nexa-vendor-performance-2026-11-18.csv"',
    );
  });

  it('sets Excel response headers and returns StreamableFile on exportVendorsExcel', async () => {
    const res = { setHeader: jest.fn() } as any;
    const file = await controller.exportVendorsExcel(
      { userId: 'admin-1', role: 'admin' } as any,
      {},
      res,
    );

    expect(file).toBeInstanceOf(StreamableFile);
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="nexa-vendor-performance-2026-11-18.xlsx"',
    );
  });
});
