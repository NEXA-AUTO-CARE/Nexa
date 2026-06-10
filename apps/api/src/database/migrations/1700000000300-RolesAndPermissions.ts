import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Introduces the RBAC tables and migrates User.role (enum) → User.role_id (FK).
 *
 *   - Creates `roles` and `role_permissions` tables (both extending the audit columns).
 *   - Seeds four system roles: customer, vendor, admin, super_admin.
 *   - Seeds default permission sets per role; super_admin receives every permission.
 *   - Adds users.role_id, backfills it from users.role, drops the old column + enum type.
 *
 * To add NEW permissions later, extend the Permission enum in @nexa/shared and write
 * a follow-up migration that inserts the new permission rows into the relevant roles.
 */
export class RolesAndPermissions1700000000300 implements MigrationInterface {
  name = 'RolesAndPermissions1700000000300';

  private readonly auditColumns = `
    "created_on" timestamptz NOT NULL DEFAULT now(),
    "updated_on" timestamptz,
    "created_by" varchar(255),
    "updated_by" varchar(255),
    "approved_on" timestamptz,
    "approved_by" varchar(255)
  `;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. roles table
    await queryRunner.query(`
      CREATE TABLE "roles" (
        "role_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(64) NOT NULL,
        "description" varchar(255),
        "is_system" boolean NOT NULL DEFAULT false,
        ${this.auditColumns}
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_roles_name" ON "roles" ("name")`,
    );

    // 2. role_permissions table
    await queryRunner.query(`
      CREATE TABLE "role_permissions" (
        "role_permission_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "role_id" uuid NOT NULL,
        "permission" varchar(64) NOT NULL,
        ${this.auditColumns},
        CONSTRAINT "fk_role_permissions_role" FOREIGN KEY ("role_id") REFERENCES "roles"("role_id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_role_permissions" ON "role_permissions" ("role_id", "permission")`,
    );

    // 3. seed the four system roles
    const systemRoles: Record<
      string,
      { description: string; permissions: string[] }
    > = {
      customer: {
        description: 'Vehicle owner who books wash services',
        permissions: [
          'users:read.self',
          'users:write.self',
          'vehicles:manage.self',
          'bookings:create',
          'bookings:read.self',
          'bookings:cancel',
          'payments:read.self',
          'reviews:create',
          'reviews:read',
          'photos:read',
        ],
      },
      vendor: {
        description: 'Detailing professional who fulfils assigned jobs',
        permissions: [
          'users:read.self',
          'users:write.self',
          'bookings:read.assigned',
          'bookings:transition',
          'photos:upload',
          'photos:read',
          'reviews:read',
        ],
      },
      admin: {
        description:
          'Operations admin: vendor matching, payouts, dispute handling',
        permissions: [
          'users:read.self',
          'users:write.self',
          'users:read.all',
          'users:write.all',
          'roles:read',
          'vehicles:read.all',
          'bookings:read.all',
          'bookings:assign-vendor',
          'bookings:cancel',
          'payments:read.all',
          'payments:refund',
          'payments:payout',
          'photos:read',
          'reviews:read',
        ],
      },
      super_admin: {
        description: 'Unrestricted access; can manage roles and permissions',
        permissions: ALL_PERMISSIONS,
      },
    };

    for (const [name, def] of Object.entries(systemRoles)) {
      await queryRunner.query(
        `INSERT INTO "roles" ("name", "description", "is_system") VALUES ($1, $2, true)`,
        [name, def.description],
      );
      for (const perm of def.permissions) {
        await queryRunner.query(
          `INSERT INTO "role_permissions" ("role_id", "permission")
             SELECT "role_id", $2 FROM "roles" WHERE "name" = $1`,
          [name, perm],
        );
      }
    }

    // 4. add users.role_id (nullable initially), backfill, then enforce NOT NULL + FK
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "role_id" uuid`);
    await queryRunner.query(
      `UPDATE "users" SET "role_id" = (SELECT "role_id" FROM "roles" WHERE "name" = "users"."role"::text)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role_id" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "fk_users_role" FOREIGN KEY ("role_id") REFERENCES "roles"("role_id") ON DELETE RESTRICT`,
    );

    // 5. drop the old enum-backed column and the enum type itself
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
    await queryRunner.query(`DROP TYPE "users_role_enum"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate the enum and column from the seeded role names so existing users don't dangle.
    await queryRunner.query(
      `CREATE TYPE "users_role_enum" AS ENUM ('customer', 'vendor', 'admin', 'super_admin')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "role" "users_role_enum"`,
    );
    await queryRunner.query(
      `UPDATE "users" SET "role" = ((SELECT "name" FROM "roles" WHERE "roles"."role_id" = "users"."role_id"))::users_role_enum`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" SET NOT NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "fk_users_role"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "role_id"`,
    );

    await queryRunner.query(`DROP TABLE IF EXISTS "role_permissions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roles"`);
  }
}

/**
 * Mirror of the Permission enum in @nexa/shared. Duplicated here because migrations are
 * standalone artifacts that should not depend on workspace TypeScript builds resolving
 * correctly years from now (the migration file should keep working even if the enum is
 * renamed or moved upstream).
 */
const ALL_PERMISSIONS: string[] = [
  'users:read.self',
  'users:write.self',
  'users:read.all',
  'users:write.all',
  'roles:read',
  'roles:manage',
  'roles:assign',
  'vehicles:manage.self',
  'vehicles:read.all',
  'bookings:create',
  'bookings:read.self',
  'bookings:read.assigned',
  'bookings:read.all',
  'bookings:assign-vendor',
  'bookings:transition',
  'bookings:cancel',
  'payments:read.self',
  'payments:read.all',
  'payments:refund',
  'payments:payout',
  'photos:upload',
  'photos:read',
  'reviews:create',
  'reviews:read',
];
