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
import { IsArray, IsUUID } from 'class-validator';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type {
  CreatePromotionDto,
  PromotionResponse,
  UpdatePromotionDto,
} from '@nexa/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PromotionsService } from '../promotions/promotions.service';

export class AssignPromotionDto {
  @IsArray()
  @IsUUID('all', { each: true })
  userIds: string[];
}

@ApiTags('admin')
@ApiBearerAuth('jwt')
@Controller('admin/promotions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminPromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get()
  @ApiOperation({ summary: 'Admin: list all promotions' })
  @ApiOkResponse({ description: 'Array of all promotions' })
  async findAll(): Promise<PromotionResponse[]> {
    const list = await this.promotionsService.findAll();
    return list.map((p) => this.promotionsService.toResponse(p));
  }

  @Post()
  @ApiOperation({ summary: 'Admin: create a new draft promotion' })
  @ApiCreatedResponse({ description: 'Promotion created as draft' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePromotionDto,
  ): Promise<PromotionResponse> {
    const promo = await this.promotionsService.create(dto, user.userId);
    return this.promotionsService.toResponse(promo);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Admin: update a draft promotion' })
  @ApiOkResponse({ description: 'Updated promotion' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePromotionDto,
  ): Promise<PromotionResponse> {
    const promo = await this.promotionsService.update(id, dto, user.userId);
    return this.promotionsService.toResponse(promo);
  }

  @Post(':id/start')
  @ApiOperation({
    summary: 'Admin: activate a promotion and broadcast to users',
  })
  @ApiOkResponse({ description: 'Promotion activated' })
  async start(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PromotionResponse> {
    const promo = await this.promotionsService.start(id, user.userId);
    return this.promotionsService.toResponse(promo);
  }

  @Post(':id/end')
  @ApiOperation({ summary: 'Admin: end an active promotion' })
  @ApiOkResponse({ description: 'Promotion ended' })
  async end(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PromotionResponse> {
    const promo = await this.promotionsService.end(id, user.userId);
    return this.promotionsService.toResponse(promo);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Admin: delete a draft promotion' })
  @ApiNoContentResponse({ description: 'Promotion deleted' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.promotionsService.remove(id);
  }

  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: assign a promotion to users' })
  @ApiOkResponse({ description: 'Promotion assigned' })
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignPromotionDto,
  ): Promise<void> {
    await this.promotionsService.assignToUsers(id, dto.userIds);
  }

  @Get(':id/assignments')
  @ApiOperation({ summary: 'Admin: get user assignments for a promotion' })
  @ApiOkResponse({ description: 'Array of user IDs' })
  async getAssignments(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<string[]> {
    return this.promotionsService.getAssignments(id);
  }
}
