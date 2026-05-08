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
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ALL_PERMISSIONS, Permission } from '@nexa/shared';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AssignRoleDto } from './dto/assign-role.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { SetPermissionsDto } from './dto/set-permissions.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

/**
 * Super-admin role and permission management. Every endpoint requires the
 * roles:manage permission, which (per the seed) is held by the super_admin
 * role only — even an admin can't create new roles by default.
 *
 * The shape of these endpoints is deliberately CRUD-style so the future
 * admin web dashboard can drive them with a generic resource component.
 */
@ApiTags('admin/roles')
@ApiBearerAuth('jwt')
@Controller('admin/roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminRolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @RequirePermissions(Permission.ROLES_READ)
  @ApiOperation({ summary: 'List all roles (system + custom)' })
  list() {
    return this.roles.list();
  }

  @Get('catalog/permissions')
  @RequirePermissions(Permission.ROLES_READ)
  @ApiOperation({ summary: 'Return the full code-defined permission catalog' })
  catalog() {
    return { permissions: ALL_PERMISSIONS };
  }

  @Get(':roleId')
  @RequirePermissions(Permission.ROLES_READ)
  @ApiOperation({ summary: 'Get a role and its assigned permissions' })
  async get(@Param('roleId', ParseUUIDPipe) roleId: string) {
    const role = await this.roles.findById(roleId);
    const permissions = await this.roles.listPermissions(roleId);
    return { ...role, permissions };
  }

  @Post()
  @RequirePermissions(Permission.ROLES_MANAGE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new (non-system) role' })
  create(@Body() dto: CreateRoleDto) {
    return this.roles.create(dto);
  }

  @Patch(':roleId')
  @RequirePermissions(Permission.ROLES_MANAGE)
  @ApiOperation({ summary: 'Rename or re-describe a role (system roles are read-only)' })
  update(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.roles.rename(roleId, dto.name ?? '', dto.description);
  }

  @Delete(':roleId')
  @RequirePermissions(Permission.ROLES_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a role (only if no users are assigned and not a system role)' })
  async remove(@Param('roleId', ParseUUIDPipe) roleId: string): Promise<void> {
    await this.roles.delete(roleId);
  }

  @Put(':roleId/permissions')
  @RequirePermissions(Permission.ROLES_MANAGE)
  @ApiOperation({ summary: 'Replace the permission set on a role' })
  async setPermissions(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() dto: SetPermissionsDto,
  ) {
    const permissions = await this.roles.setPermissions(roleId, dto.permissions as Permission[]);
    return { roleId, permissions };
  }

  @Post('assign')
  @RequirePermissions(Permission.ROLES_ASSIGN)
  @ApiOperation({ summary: 'Assign a role to a user (replaces their current role)' })
  async assign(@Body() dto: AssignRoleDto) {
    const user = await this.roles.assignRoleToUser(dto.userId, dto.roleId);
    return { userId: user.userId, roleId: user.roleId };
  }
}
