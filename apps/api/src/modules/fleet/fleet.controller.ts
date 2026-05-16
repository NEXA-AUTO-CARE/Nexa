import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@nexa/shared';
import { FleetService } from './fleet.service';

@Controller('fleet')
export class FleetController {
  constructor(private readonly fleetService: FleetService) {}

  @Public()
  @Post('inquiry')
  async createInquiry(@Body() dto: any) {
    return await this.fleetService.createInquiry(dto);
  }

  @Roles(UserRole.ADMIN)
  @Get('inquiries')
  async getAllInquiries() {
    return await this.fleetService.getAllInquiries();
  }
}
