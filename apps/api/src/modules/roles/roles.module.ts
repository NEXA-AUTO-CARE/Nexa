import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role, RolePermission, User } from '../../database/entities';
import { AdminRolesController } from './admin-roles.controller';
import { RolesService } from './roles.service';
import { SuperAdminBootstrap } from './super-admin.bootstrap';

@Module({
  imports: [TypeOrmModule.forFeature([Role, RolePermission, User])],
  providers: [RolesService, SuperAdminBootstrap],
  controllers: [AdminRolesController],
  exports: [RolesService],
})
export class RolesModule {}
