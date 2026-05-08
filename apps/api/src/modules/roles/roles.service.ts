import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ALL_PERMISSIONS, Permission } from '@nexa/shared';
import { In, Repository } from 'typeorm';
import { Role, RolePermission, User } from '../../database/entities';

const VALID_PERMISSIONS = new Set<string>(ALL_PERMISSIONS);

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(RolePermission)
    private readonly rpRepo: Repository<RolePermission>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  // ---------- lookups ----------

  async findByName(name: string): Promise<Role | null> {
    return this.roleRepo.findOne({ where: { name } });
  }

  async findByNameOrFail(name: string): Promise<Role> {
    const role = await this.findByName(name);
    if (!role) throw new NotFoundException(`Role '${name}' not found`);
    return role;
  }

  async findById(roleId: string): Promise<Role> {
    const role = await this.roleRepo.findOne({ where: { roleId } });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async list(): Promise<Role[]> {
    return this.roleRepo.find({ order: { isSystem: 'DESC', name: 'ASC' } });
  }

  /** Return the permission codes attached to a role (as plain strings). */
  async listPermissions(roleId: string): Promise<Permission[]> {
    const rows = await this.rpRepo.find({ where: { roleId } });
    return rows.map((r) => r.permission as Permission);
  }

  // ---------- super_admin CRUD ----------

  async create(args: { name: string; description?: string | null }): Promise<Role> {
    const trimmed = args.name.trim().toLowerCase().replace(/\s+/g, '_');
    if (!/^[a-z][a-z0-9_]{1,62}$/.test(trimmed)) {
      throw new BadRequestException(
        'Role name must be lowercase letters, digits or underscores (start with a letter)',
      );
    }
    const existing = await this.findByName(trimmed);
    if (existing) throw new ConflictException(`Role '${trimmed}' already exists`);
    const role = this.roleRepo.create({
      name: trimmed,
      description: args.description ?? null,
      isSystem: false,
    });
    return this.roleRepo.save(role);
  }

  async rename(roleId: string, name: string, description?: string | null): Promise<Role> {
    const role = await this.findById(roleId);
    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be renamed');
    }
    role.description = description ?? role.description;
    if (name && name !== role.name) {
      const trimmed = name.trim().toLowerCase().replace(/\s+/g, '_');
      const clash = await this.findByName(trimmed);
      if (clash) throw new ConflictException(`Role '${trimmed}' already exists`);
      role.name = trimmed;
    }
    return this.roleRepo.save(role);
  }

  async delete(roleId: string): Promise<void> {
    const role = await this.findById(roleId);
    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be deleted');
    }
    const usersWithRole = await this.userRepo.count({ where: { roleId } });
    if (usersWithRole > 0) {
      throw new ConflictException(
        `Cannot delete role: ${usersWithRole} user(s) still assigned. Reassign them first.`,
      );
    }
    await this.roleRepo.remove(role);
  }

  /**
   * Replace the permission set on a role. Validates every permission against the
   * code-defined catalog so the DB never stores a typo'd permission.
   */
  async setPermissions(roleId: string, permissions: Permission[]): Promise<Permission[]> {
    const role = await this.findById(roleId);
    const unknown = permissions.filter((p) => !VALID_PERMISSIONS.has(p));
    if (unknown.length > 0) {
      throw new BadRequestException(`Unknown permission(s): ${unknown.join(', ')}`);
    }
    const desired = new Set(permissions);
    const existing = await this.rpRepo.find({ where: { roleId } });
    const existingByPerm = new Map(existing.map((r) => [r.permission, r]));

    const toAdd: RolePermission[] = [];
    for (const perm of desired) {
      if (!existingByPerm.has(perm)) {
        toAdd.push(this.rpRepo.create({ roleId: role.roleId, permission: perm }));
      }
    }
    const toRemoveIds = existing
      .filter((r) => !desired.has(r.permission as Permission))
      .map((r) => r.rolePermissionId);

    if (toAdd.length > 0) await this.rpRepo.save(toAdd);
    if (toRemoveIds.length > 0) {
      await this.rpRepo.delete({ rolePermissionId: In(toRemoveIds) });
    }
    return this.listPermissions(roleId);
  }

  /** Assign an existing role to an existing user. */
  async assignRoleToUser(userId: string, roleId: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { userId } });
    if (!user) throw new NotFoundException('User not found');
    await this.findById(roleId); // throws if missing
    user.roleId = roleId;
    return this.userRepo.save(user);
  }
}
