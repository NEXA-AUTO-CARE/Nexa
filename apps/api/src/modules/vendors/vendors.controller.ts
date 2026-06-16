import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { VendorsService } from './vendors.service';
import { VendorProfile } from '../../database/entities/vendor-profile.entity';
import { UpdateVendorDto } from './dto/create-vendor.dto';

@ApiTags('vendors')
@ApiBearerAuth('jwt')
@Controller('vendors')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('VENDOR')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get('me/profile')
  @ApiOperation({ summary: 'Vendor: Get own profile' })
  @ApiOkResponse({ description: 'Vendor profile details' })
  async getProfile(@CurrentUser() user: AuthenticatedUser): Promise<VendorProfile> {
    return this.vendorsService.findById(user.userId);
  }

  @Patch('me/profile')
  @ApiOperation({ summary: 'Vendor: Update own profile' })
  @ApiOkResponse({ description: 'Updated vendor profile' })
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateVendorDto,
  ): Promise<VendorProfile> {
    // Prevent vendors from updating their own status. 
    // Wait, the DTO allows approvalStatus. We must ensure only admin can do it, so we strip it.
    // Actually, creating a separate DTO for Vendor is better or just stripping it manually here.
    return this.vendorsService.updateProfile(user.userId, {
      companyName: dto.companyName,
    });
  }

  @Get('me/metrics')
  @ApiOperation({ summary: 'Vendor: Get dashboard metrics' })
  @ApiOkResponse({ description: 'Dashboard metrics' })
  async getMetrics(@CurrentUser() user: AuthenticatedUser) {
    return this.vendorsService.getVendorFinancials(user.userId);
  }
}
