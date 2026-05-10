import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PublicUserDto } from './dto/public-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth('jwt')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the currently authenticated user profile' })
  @ApiResponse({ status: 200, type: PublicUserDto })
  async me(@CurrentUser() current: AuthenticatedUser): Promise<PublicUserDto> {
    const user = await this.users.findById(current.userId);
    return this.users.toPublic(user);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update the current user profile' })
  @ApiResponse({ status: 200, type: PublicUserDto })
  async updateMe(
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: UpdateUserDto,
  ): Promise<PublicUserDto> {
    const user = await this.users.update(current.userId, dto);
    return this.users.toPublic(user);
  }
}
