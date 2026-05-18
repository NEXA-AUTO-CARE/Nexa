import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { CorporateFleetEnquiryResponse } from '@nexa/shared';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CorporateService } from './corporate.service';
import { CreateCorporateFleetEnquiryDto } from './dto/corporate.dto';

@ApiTags('corporate-fleet')
@Controller('corporate-fleet')
export class CorporateController {
  constructor(private readonly corporate: CorporateService) {}

  @Post()
  @Public()
  @ApiOperation({ summary: 'Submit a corporate fleet enquiry' })
  @ApiCreatedResponse({ description: 'Enquiry submitted' })
  async create(
    @Body() dto: CreateCorporateFleetEnquiryDto,
  ): Promise<CorporateFleetEnquiryResponse> {
    return this.corporate.create(dto);
  }

  @Get()
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Admin: list corporate fleet enquiries' })
  @ApiOkResponse({ description: 'Array of enquiries' })
  async findAll(): Promise<CorporateFleetEnquiryResponse[]> {
    return this.corporate.findAll();
  }

  @Patch(':id/invoiced')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Admin: mark an enquiry as invoiced' })
  @ApiOkResponse({ description: 'Updated enquiry' })
  async markInvoiced(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CorporateFleetEnquiryResponse> {
    return this.corporate.markInvoiced(id);
  }
}
