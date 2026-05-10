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
import type { VehicleResponse } from '@nexa/shared';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehiclesService } from './vehicles.service';

@ApiTags('vehicles')
@ApiBearerAuth('jwt')
@Controller('vehicles')
@UseGuards(JwtAuthGuard)
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @Post()
  @ApiOperation({ summary: 'Register a new vehicle' })
  @ApiCreatedResponse({ description: 'Vehicle created' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateVehicleDto,
  ): Promise<VehicleResponse> {
    const vehicle = await this.vehicles.create(user.userId, dto);
    return this.vehicles.toResponse(vehicle);
  }

  @Get()
  @ApiOperation({ summary: "List the current user's vehicles" })
  @ApiOkResponse({ description: 'Array of vehicles' })
  async findAll(@CurrentUser() user: AuthenticatedUser): Promise<VehicleResponse[]> {
    const list = await this.vehicles.findAllByOwner(user.userId);
    return list.map((v) => this.vehicles.toResponse(v));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a vehicle by ID' })
  @ApiOkResponse({ description: 'Vehicle details' })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<VehicleResponse> {
    const vehicle = await this.vehicles.findByIdForOwner(id, user.userId);
    return this.vehicles.toResponse(vehicle);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a vehicle' })
  @ApiOkResponse({ description: 'Updated vehicle' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVehicleDto,
  ): Promise<VehicleResponse> {
    const vehicle = await this.vehicles.update(id, user.userId, dto);
    return this.vehicles.toResponse(vehicle);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a vehicle' })
  @ApiNoContentResponse({ description: 'Vehicle removed' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.vehicles.remove(id, user.userId);
  }
}
