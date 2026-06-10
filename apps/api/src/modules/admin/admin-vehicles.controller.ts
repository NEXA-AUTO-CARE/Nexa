import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { VehiclesService } from '../vehicles/vehicles.service';
import type { VehicleResponse } from '@nexa/shared';

@ApiTags('admin')
@ApiBearerAuth('jwt')
@Controller('admin/vehicles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminVehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  @ApiOperation({ summary: 'Admin: list all vehicles' })
  @ApiOkResponse({ description: 'Array of all vehicles' })
  async findAll(): Promise<(VehicleResponse & { ownerName?: string })[]> {
    const list = await this.vehiclesService.findAllForAdmin();
    return list.map((v) => ({
      ...this.vehiclesService.toResponse(v),
      ownerName: v.owner
        ? `${v.owner.firstName} ${v.owner.lastName}`.trim() ||
          v.owner.displayName
        : undefined,
    }));
  }
}
