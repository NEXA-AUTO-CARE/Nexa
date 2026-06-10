import { Column, Entity, Index, OneToMany, PrimaryColumn } from 'typeorm';
import { AuditEntity } from './audit.entity';
import { RolePermission } from './role-permission.entity';
import { User } from './user.entity';

@Entity('roles')
export class Role extends AuditEntity {
  @PrimaryColumn({ type: 'uuid', name: 'role_id', default: () => 'uuidv7()' })
  roleId: string;

  /** Stable machine name, e.g. "customer", "vendor", "admin", "super_admin", or a custom one. */
  @Index('uq_roles_name', { unique: true })
  @Column({ type: 'varchar', length: 64 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  /** System roles (the four that ship with Nexa) cannot be deleted or renamed. */
  @Column({ type: 'boolean', default: false, name: 'is_system' })
  isSystem: boolean;

  @OneToMany(() => RolePermission, (rp) => rp.role, {
    cascade: ['insert', 'remove'],
  })
  rolePermissions: RolePermission[];

  @OneToMany(() => User, (u) => u.role)
  users: User[];
}
