import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SettingsService } from './settings.service';
import type { SystemSettingResponse, SaveSystemSettingDto } from '@nexa/shared';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all system settings' })
  async findAll(): Promise<SystemSettingResponse[]> {
    const settings = await this.settingsService.findAll();
    return settings.map((s) => ({
      key: s.key,
      value: s.value,
    }));
  }

  @Get(':key')
  @Public()
  @ApiOperation({ summary: 'Get system setting by key' })
  async findOne(@Param('key') key: string): Promise<SystemSettingResponse> {
    const setting = await this.settingsService.findOne(key);
    return {
      key,
      value: setting?.value ?? '',
    };
  }

  @Post(':key')
  @ApiBearerAuth('jwt')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Save system setting (Admin only)' })
  async saveSetting(
    @Param('key') key: string,
    @Body() dto: SaveSystemSettingDto,
  ): Promise<SystemSettingResponse> {
    const saved = await this.settingsService.saveSetting(key, dto.value);
    return {
      key: saved.key,
      value: saved.value,
    };
  }
}
