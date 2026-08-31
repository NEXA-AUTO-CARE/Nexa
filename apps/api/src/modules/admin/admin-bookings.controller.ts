import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  ParseUUIDPipe,
  UseGuards,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { BookingsService } from '../bookings/bookings.service';
import { VendorsService } from '../vendors/vendors.service';
import { AssignVendorDto } from '../bookings/dto/create-booking.dto';
import { PaymentsService } from '../payments/payments.service';
import type { BookingResponse } from '@nexa/shared';
import { BadRequestException } from '@nestjs/common';
import { UpdateBookingStatusDto } from '../bookings/dto/update-booking-status.dto';
import { UpdatePaymentStatusDto } from '../bookings/dto/update-payment-status.dto';
import { AdminUpdateBookingDto } from '../bookings/dto/update-booking.dto';
import { AuditTrailService } from '../../common/audit/audit-trail.service';

@ApiTags('admin')
@ApiBearerAuth('jwt')
@Controller('admin/bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminBookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly vendorsService: VendorsService,
    private readonly auditTrail: AuditTrailService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Admin: list all bookings' })
  @ApiOkResponse({ description: 'Array of all bookings' })
  async findAll(): Promise<BookingResponse[]> {
    const list = await this.bookingsService.findAllForAdmin();
    return list.map((b) => this.bookingsService.toResponse(b));
  }

  @Patch(':id/assign-vendor')
  @ApiOperation({ summary: 'Admin: assign vendor to booking' })
  @ApiOkResponse({ description: 'Booking with vendor assigned' })
  async assignVendor(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignVendorDto,
  ): Promise<BookingResponse> {
    const vendor = await this.vendorsService.findById(dto.vendorId);
    if (!vendor) {
      throw new BadRequestException('Vendor not found');
    }
    if (vendor.approvalStatus !== 'ACTIVE') {
      throw new BadRequestException('Cannot assign an inactive vendor');
    }

    const existing = await this.bookingsService.findById(id);
    const oldVendorId = existing.vendorId;
    const oldStatus = existing.status;

    const booking = await this.bookingsService.assignVendor(id, dto.vendorId);

    await this.auditTrail.record(
      'BOOKING',
      id,
      'ASSIGN_VENDOR',
      { vendorId: oldVendorId, status: oldStatus },
      { vendorId: dto.vendorId, status: booking.status },
      user.userId,
    );

    return this.bookingsService.toResponse(booking);
  }

  @Get(':id/nearby-vendors')
  @ApiOperation({ summary: 'Admin: find nearby vendors for a booking' })
  @ApiOkResponse({ description: 'List of nearby vendors sorted by distance' })
  async getNearbyVendors(@Param('id', ParseUUIDPipe) id: string) {
    const booking = await this.bookingsService.findById(id);
    if (!booking.latitude || !booking.longitude) {
      throw new BadRequestException('Booking location is not available');
    }

    const lat = parseFloat(booking.latitude);
    const lon = parseFloat(booking.longitude);
    return this.vendorsService.findNearbyVendors(lat, lon, 50); // 50km radius
  }

  @Get(':id')
  @ApiOperation({ summary: 'Admin: get booking details' })
  @ApiOkResponse({ description: 'Booking details' })
  async getBooking(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BookingResponse> {
    const booking = await this.bookingsService.findByIdWithRelations(id);
    return this.bookingsService.toResponse(booking);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Admin: update booking status' })
  @ApiOkResponse({ description: 'Updated booking' })
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBookingStatusDto,
  ): Promise<BookingResponse> {
    const existing = await this.bookingsService.findById(id);
    const oldStatus = existing.status;

    const booking = await this.bookingsService.adminUpdateStatus(
      id,
      dto.status,
    );

    await this.auditTrail.record(
      'BOOKING',
      id,
      'UPDATE_STATUS',
      { status: oldStatus },
      { status: dto.status },
      user.userId,
    );

    return this.bookingsService.toResponse(booking);
  }

  @Patch(':id/payment-status')
  @ApiOperation({ summary: 'Admin: update payment status' })
  @ApiOkResponse({ description: 'Updated booking' })
  async updatePaymentStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePaymentStatusDto,
  ): Promise<BookingResponse> {
    const existing = await this.bookingsService.findById(id);
    const oldPaymentStatus = existing.paymentStatus;

    const booking = await this.bookingsService.updatePaymentStatus(
      id,
      dto.status,
    );

    await this.auditTrail.record(
      'BOOKING',
      id,
      'UPDATE_PAYMENT_STATUS',
      { paymentStatus: oldPaymentStatus },
      { paymentStatus: dto.status },
      user.userId,
    );

    return this.bookingsService.toResponse(booking);
  }

  @Post(':id/sync-payment')
  @ApiOperation({ summary: 'Admin: sync payment status from Stripe' })
  @ApiOkResponse({ description: 'Synced booking' })
  async syncPaymentStatus(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BookingResponse> {
    await this.paymentsService.syncPaymentStatusByBookingId(id);
    return this.getBooking(id);
  }

  @Patch(':id/edit')
  @ApiOperation({ summary: 'Admin: edit booking (addons, time, address)' })
  @ApiOkResponse({ description: 'Updated booking' })
  async editBooking(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminUpdateBookingDto,
  ): Promise<BookingResponse> {
    const booking = await this.bookingsService.adminUpdateBooking(id, dto);

    await this.auditTrail.record(
      'BOOKING',
      id,
      'UPDATE_BOOKING_DETAILS',
      null,
      { ...dto },
      user.userId,
    );

    return this.bookingsService.toResponse(booking);
  }
}
