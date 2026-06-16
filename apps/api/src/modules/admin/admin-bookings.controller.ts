import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  ParseUUIDPipe,
  UseGuards,
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
import { BookingsService } from '../bookings/bookings.service';
import { VendorsService } from '../vendors/vendors.service';
import { AssignVendorDto } from '../bookings/dto/create-booking.dto';
import type { BookingResponse } from '@nexa/shared';
import { BadRequestException } from '@nestjs/common';

@ApiTags('admin')
@ApiBearerAuth('jwt')
@Controller('admin/bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminBookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly vendorsService: VendorsService,
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
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignVendorDto,
  ): Promise<BookingResponse> {
    const booking = await this.bookingsService.assignVendor(id, dto.vendorId);
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
}
