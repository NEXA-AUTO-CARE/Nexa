import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UsersService } from '../users/users.service';
import { PublicUserDto } from '../users/dto/public-user.dto';
import type { UpdateUserAdminDto } from '@nexa/shared';

@ApiTags('admin')
@ApiBearerAuth('jwt')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Admin: list all users' })
  @ApiOkResponse({ type: [PublicUserDto] })
  async findAll(): Promise<PublicUserDto[]> {
    const list = await this.usersService.findAllForAdmin();
    return list.map((u) => this.usersService.toPublic(u));
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
}
