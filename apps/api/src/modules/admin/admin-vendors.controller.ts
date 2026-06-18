import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiTags,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { VendorsService } from '../vendors/vendors.service';
import {
  CreateVendorDto,
  UpdateVendorDto,
} from '../vendors/dto/create-vendor.dto';
import { VendorProfile } from '../../database/entities/vendor-profile.entity';

@ApiTags('admin')
@ApiBearerAuth('jwt')
@Controller('admin/vendors')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AdminVendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Post()
  @ApiOperation({ summary: 'Admin: Create a new vendor account' })
  @ApiCreatedResponse({ description: 'Vendor created', type: VendorProfile })
  async createVendor(@Body() dto: CreateVendorDto): Promise<VendorProfile> {
    return this.vendorsService.createVendorByAdmin(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Admin: List all vendors' })
  @ApiOkResponse({ description: 'List of vendor profiles' })
  async findAll(): Promise<VendorProfile[]> {
    return this.vendorsService.findAllForAdmin();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Admin: Get vendor by id' })
  @ApiOkResponse({ description: 'Vendor profile details' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<VendorProfile> {
    return this.vendorsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Admin: Update vendor profile or status' })
  @ApiOkResponse({ description: 'Updated vendor profile' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVendorDto,
  ): Promise<VendorProfile> {
    return this.vendorsService.updateVendorByAdmin(id, dto);
  }

  @Get(':id/financials')
  @ApiOperation({ summary: 'Admin: Get vendor financials' })
  @ApiOkResponse({ description: 'Vendor financials summary' })
  async getFinancials(@Param('id', ParseUUIDPipe) id: string) {
    return this.vendorsService.getVendorFinancials(id);
  }
}
