import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UsersService } from '../users/users.service';
import { PublicUserDto } from '../users/dto/public-user.dto';
import { BookingsService } from '../bookings/bookings.service';
import type { UpdateUserAdminDto, BookingResponse } from '@nexa/shared';

@ApiTags('admin')
@ApiBearerAuth('jwt')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminUsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly bookingsService: BookingsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Admin: list users with optional status filter' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['all', 'active', 'inactive'],
  })
  @ApiOkResponse({ type: [PublicUserDto] })
  async findAll(
    @Query('status') status?: 'all' | 'active' | 'inactive',
  ): Promise<PublicUserDto[]> {
    const list = await this.usersService.findAllForAdmin(status);
    return list.map((u) => this.usersService.toPublic(u));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Admin: get user details' })
  @ApiOkResponse({ type: PublicUserDto })
  async getUser(@Param('id') id: string): Promise<PublicUserDto> {
    const user = await this.usersService.findById(id);
    return this.usersService.toPublic(user);
  }

  @Get(':id/bookings')
  @ApiOperation({ summary: 'Admin: get bookings for a user' })
  @ApiOkResponse({ description: 'List of bookings' })
  async getUserBookings(@Param('id') id: string): Promise<BookingResponse[]> {
    // Make sure user exists
    await this.usersService.findById(id);
    const bookings = await this.bookingsService.findAllByUser(id);
    return bookings.map((b) => this.bookingsService.toResponse(b));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Admin: update user role or display name' })
  @ApiOkResponse({ type: PublicUserDto })
  async updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserAdminDto,
  ): Promise<PublicUserDto> {
    const updated = await this.usersService.adminUpdateUser(id, dto);
    return this.usersService.toPublic(updated);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Admin: delete a user' })
  @ApiOkResponse({ description: 'User deleted' })
  async deleteUser(@Param('id') id: string): Promise<void> {
    await this.usersService.deleteUser(id);
  }
}
