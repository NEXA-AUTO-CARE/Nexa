import {
  Controller,
  Get,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { ReportingAnalyticsResponse } from '@nexa/shared';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ReportingQueryDto } from './dto/reporting-query.dto';
import { ReportingService } from './reporting.service';

const EXCEL_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@ApiTags('admin/reporting')
@ApiBearerAuth('jwt')
@Controller('admin/reporting')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  private toDownloadStream(
    res: Response,
    buffer: Buffer,
    contentType: string,
    filename: string,
    rowCount: number,
  ): StreamableFile {
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Report-Row-Count', String(rowCount));
    res.setHeader('Cache-Control', 'no-store');
    return new StreamableFile(buffer);
  }

  @Get('analytics')
  @ApiOperation({
    summary: 'Admin: get comprehensive booking, revenue, and vendor analytics',
  })
  @ApiOkResponse({
    description:
      'Aggregated KPIs, time-series trends, breakdowns, vendor performance, and paginated bookings',
  })
  async getAnalytics(
    @Query() query: ReportingQueryDto,
  ): Promise<ReportingAnalyticsResponse> {
    return this.reportingService.getAnalytics(query);
  }

  @Get('bookings')
  @ApiOperation({
    summary: 'Admin: get paginated flattened booking rows for reporting table',
  })
  @ApiOkResponse({ description: 'Paginated booking report rows' })
  async getBookingsTable(
    @Query() query: ReportingQueryDto,
  ): Promise<ReportingAnalyticsResponse['bookings']> {
    return this.reportingService.getBookingsTable(query);
  }

  @Get('bookings/export')
  @ApiOperation({
    summary: 'Admin: export filtered booking data as a CSV file',
  })
  @ApiProduces('text/csv')
  @ApiOkResponse({
    description: 'UTF-8 CSV stream of filtered booking records',
  })
  async exportBookingsCsv(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportingQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { csv, filename, rowCount } =
      await this.reportingService.exportBookingsCsv(query, user.userId);

    return this.toDownloadStream(
      res,
      Buffer.from(csv, 'utf-8'),
      'text/csv; charset=utf-8',
      filename,
      rowCount,
    );
  }

  @Get('bookings/export/excel')
  @ApiOperation({
    summary:
      'Admin: export filtered booking analytics & records as an Excel (.xlsx) workbook',
  })
  @ApiProduces(EXCEL_MIME)
  @ApiOkResponse({
    description: 'Multi-sheet Excel (.xlsx) report matching active filters',
  })
  async exportBookingsExcel(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportingQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { buffer, filename, rowCount } =
      await this.reportingService.exportBookingsExcel(query, user.userId);

    return this.toDownloadStream(res, buffer, EXCEL_MIME, filename, rowCount);
  }

  @Get('bookings/export/pdf')
  @ApiOperation({
    summary:
      'Admin: download filtered booking & analytics report in PDF format',
  })
  @ApiProduces('application/pdf')
  @ApiOkResponse({
    description: 'Landscape A4 PDF report matching active filters',
  })
  async exportBookingsPdf(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportingQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { buffer, filename, rowCount } =
      await this.reportingService.exportBookingsPdf(query, user.userId);

    return this.toDownloadStream(
      res,
      buffer,
      'application/pdf',
      filename,
      rowCount,
    );
  }

  @Get('vendors/export')
  @ApiOperation({
    summary: 'Admin: export vendor performance summary as a CSV file',
  })
  @ApiProduces('text/csv')
  @ApiOkResponse({
    description: 'UTF-8 CSV stream of vendor performance metrics',
  })
  async exportVendorsCsv(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportingQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { csv, filename, rowCount } =
      await this.reportingService.exportVendorsCsv(query, user.userId);

    return this.toDownloadStream(
      res,
      Buffer.from(csv, 'utf-8'),
      'text/csv; charset=utf-8',
      filename,
      rowCount,
    );
  }

  @Get('vendors/export/excel')
  @ApiOperation({
    summary:
      'Admin: export vendor performance summary as an Excel (.xlsx) workbook',
  })
  @ApiProduces(EXCEL_MIME)
  @ApiOkResponse({
    description: 'Excel (.xlsx) vendor performance workbook',
  })
  async exportVendorsExcel(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ReportingQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { buffer, filename, rowCount } =
      await this.reportingService.exportVendorsExcel(query, user.userId);

    return this.toDownloadStream(res, buffer, EXCEL_MIME, filename, rowCount);
  }
}
