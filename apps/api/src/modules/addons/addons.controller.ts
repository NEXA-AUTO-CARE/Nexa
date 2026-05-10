import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AddonResponse } from '@nexa/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AddonsService } from './addons.service';
import { CreateAddonDto, UpdateAddonDto } from './dto/addon.dto';

@ApiTags('addons')
@Controller('addons')
export class AddonsController {
  constructor(private readonly addonsService: AddonsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all add-ons' })
  async findAll(@Query('all') all?: boolean): Promise<AddonResponse[]> {
    // If all=true, return inactive ones as well (admin only ideally, but keeping simple for now)
    return this.addonsService.findAll(all !== true);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get add-on by ID' })
  async findOne(@Param('id') id: string): Promise<AddonResponse> {
    return this.addonsService.findById(id);
  }

  @Post()
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN') // or Organization Admin
  @ApiOperation({ summary: 'Create a new add-on' })
  async create(@Body() dto: CreateAddonDto): Promise<AddonResponse> {
    return this.addonsService.create(dto);
  }

  @Put(':id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Update an add-on' })
  async update(@Param('id') id: string, @Body() dto: UpdateAddonDto): Promise<AddonResponse> {
    return this.addonsService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Delete an add-on' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.addonsService.delete(id);
  }
}
