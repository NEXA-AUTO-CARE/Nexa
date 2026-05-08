import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditEntity } from './audit.entity';
import { Role } from './role.entity';

/**
 * Maps a role to one of the code-defined Permission codes.
 * The (role_id, permission) pair is unique.
 */
@Entity('role_permissions')
@Index('uq_role_permissions', ['roleId', 'permission'], { unique: true })
export class RolePermission extends AuditEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'role_permission_id' })
  rolePermissionId: string;

  @Column({ type: 'uuid' })
  roleId: string;

  @ManyToOne(() => Role, (r) => r.rolePermissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  /** Matches values from the Permission enum in @nexa/shared. */
  @Column({ type: 'varchar', length: 64 })
  permission: string;
}
