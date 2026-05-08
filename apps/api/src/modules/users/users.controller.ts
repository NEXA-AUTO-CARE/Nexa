import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PublicUser } from '@nexa/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
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
  async me(@CurrentUser() current: AuthenticatedUser): Promise<PublicUser> {
    const user = await this.users.findById(current.userId);
    return this.users.toPublic(user);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update the current user profile' })
  async updateMe(
    @CurrentUser() current: AuthenticatedUser,
    @Body() dto: UpdateUserDto,
  ): Promise<PublicUser> {
    const user = await this.users.update(current.userId, dto);
    return this.users.toPublic(user);
  }
}
