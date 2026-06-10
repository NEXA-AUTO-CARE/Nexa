import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { UserRole } from '@nexa/shared';
import { Repository } from 'typeorm';
import { User } from '../../database/entities';
import { RolesService } from './roles.service';

/**
 * On application boot, if SUPER_ADMIN_EMAIL is configured AND a user with that
 * email already exists in the database, ensures they hold the `super_admin` role.
 *
 * This is the bootstrap path: a developer signs up normally with that email,
 * the API restarts, and from then on that user can manage roles/permissions.
 * The service does NOT create the user — that would require choosing a password
 * out-of-band, which is unsafe.
 *
 * To rotate the super-admin without env var: a current super_admin uses the
 * /api/admin/roles/assign endpoint to grant the role to a new user.
 */
@Injectable()
export class SuperAdminBootstrap implements OnApplicationBootstrap {
  private readonly logger = new Logger(SuperAdminBootstrap.name);

  constructor(
    private readonly config: ConfigService,
    private readonly roles: RolesService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const email = this.config.get<string | null>(
      'app.bootstrap.superAdminEmail',
    );
    if (!email) return;

    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      this.logger.warn(
        `SUPER_ADMIN_EMAIL=${email} configured, but no user with that email exists yet. ` +
          `Sign up first; the role will be promoted automatically on the next restart.`,
      );
      return;
    }

    const targetRole = await this.roles.findByNameOrFail(UserRole.SUPER_ADMIN);
    if (user.roleId === targetRole.roleId) {
      this.logger.log(`super_admin already assigned to ${email}`);
      return;
    }

    await this.roles.assignRoleToUser(user.userId, targetRole.roleId);
    this.logger.log(`Promoted ${email} to super_admin on bootstrap`);
  }
}
