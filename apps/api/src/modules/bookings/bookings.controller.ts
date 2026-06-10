import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { BookingResponse } from '@nexa/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BookingsService } from './bookings.service';
import {
  AssignVendorDto,
  CreateBookingDto,
  RebookDto,
} from './dto/create-booking.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';

@ApiTags('bookings')
@ApiBearerAuth('jwt')
@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiCreatedResponse({ description: 'Booking created' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateBookingDto,
  ): Promise<BookingResponse> {
    const booking = await this.bookings.create(user.userId, dto);
    return this.bookings.toResponse(booking);
  }

  @Get()
  @ApiOperation({ summary: "List the current user's bookings" })
  @ApiOkResponse({ description: 'Array of bookings' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BookingResponse[]> {
    const list = await this.bookings.findAllByUser(user.userId);
    return list.map((b) => this.bookings.toResponse(b));
  }

  @Post(':id/rebook')
  @ApiOperation({
    summary: 'Re-book a previous wash without re-entering details',
  })
  @ApiCreatedResponse({
    description: 'New booking created from a previous one',
  })
  async rebook(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RebookDto,
  ): Promise<BookingResponse> {
    const booking = await this.bookings.rebook(
      id,
      user.userId,
      dto.bookingTime,
    );
    return this.bookings.toResponse(booking);
  }

  @Get('admin/all')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Admin: list all bookings' })
  @ApiOkResponse({ description: 'Array of all bookings' })
  async findAllForAdmin(): Promise<BookingResponse[]> {
    const list = await this.bookings.findAllForAdmin();
    return list.map((b) => this.bookings.toResponse(b));
  }

  @Patch(':id/assign-vendor')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Admin: assign a vendor to a booking' })
  @ApiOkResponse({ description: 'Updated booking' })
  async assignVendor(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignVendorDto,
  ): Promise<BookingResponse> {
    const booking = await this.bookings.assignVendor(id, dto.vendorId);
    return this.bookings.toResponse(booking);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a booking by ID' })
  @ApiOkResponse({ description: 'Booking details' })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BookingResponse> {
    const booking = await this.bookings.verifyMyBooking(id, user.userId);
    return this.bookings.toResponse(booking);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update booking status' })
  @ApiOkResponse({ description: 'Updated booking' })
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBookingStatusDto,
  ): Promise<BookingResponse> {
    const booking = await this.bookings.updateStatus(
      id,
      user.userId,
      dto.status,
    );
    return this.bookings.toResponse(booking);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel a booking' })
  @ApiNoContentResponse({ description: 'Booking cancelled' })
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.bookings.cancel(id, user.userId);
  }

  @Post(':id/review')
  @ApiOperation({ summary: 'Submit a review for a completed booking' })
  @ApiCreatedResponse({ description: 'Review created successfully' })
  async createReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateReviewDto,
  ): Promise<any> {
    return this.bookings.createReview(id, user.userId, dto);
  }
}
