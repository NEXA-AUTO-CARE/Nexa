import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Schema delta for the AuditEntity refactor:
 * - Adds super_admin to users_role_enum.
 * - Adds first_name / last_name to users (nullable, NOT unique).
 * - Renames created_at → created_on across audited tables.
 * - Renames updated_at → updated_on (or adds it where missing) and makes it nullable.
 * - Renames job_photos.uploaded_at → created_on.
 * - Adds created_by, updated_by, approved_on, approved_by to every audited table.
 *
 * Audited tables (post-migration): users, vehicles, bookings, payments, reviews,
 * job_photos, otp_codes, refresh_tokens.
 */
export class AddAuditColumnsAndUserNames1700000000200 implements MigrationInterface {
  name = 'AddAuditColumnsAndUserNames1700000000200';

  private readonly tablesWithCreatedAndUpdated = ['users', 'bookings'];
  private readonly tablesWithCreatedOnly = [
    'vehicles',
    'payments',
    'reviews',
    'otp_codes',
    'refresh_tokens',
  ];
  private readonly allAuditedTables = [
    ...this.tablesWithCreatedAndUpdated,
    ...this.tablesWithCreatedOnly,
    'job_photos',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "users_role_enum" ADD VALUE IF NOT EXISTS 'super_admin'`,
    );

    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "first_name" varchar(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "last_name" varchar(100)`,
    );

    for (const table of this.tablesWithCreatedAndUpdated) {
      await queryRunner.query(
        `ALTER TABLE "${table}" RENAME COLUMN "created_at" TO "created_on"`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" RENAME COLUMN "updated_at" TO "updated_on"`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "updated_on" DROP NOT NULL`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "updated_on" DROP DEFAULT`,
      );
    }

    for (const table of this.tablesWithCreatedOnly) {
      await queryRunner.query(
        `ALTER TABLE "${table}" RENAME COLUMN "created_at" TO "created_on"`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN "updated_on" timestamptz`,
      );
    }

    await queryRunner.query(
      `ALTER TABLE "job_photos" RENAME COLUMN "uploaded_at" TO "created_on"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_photos" ADD COLUMN "updated_on" timestamptz`,
    );

    for (const table of this.allAuditedTables) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN "created_by" varchar(255)`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN "updated_by" varchar(255)`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN "approved_on" timestamptz`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN "approved_by" varchar(255)`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.allAuditedTables) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "approved_by"`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "approved_on"`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "updated_by"`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "created_by"`,
      );
    }

    await queryRunner.query(
      `ALTER TABLE "job_photos" DROP COLUMN IF EXISTS "updated_on"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_photos" RENAME COLUMN "created_on" TO "uploaded_at"`,
    );

    for (const table of this.tablesWithCreatedOnly) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "updated_on"`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" RENAME COLUMN "created_on" TO "created_at"`,
      );
    }

    for (const table of this.tablesWithCreatedAndUpdated) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "updated_on" SET DEFAULT now()`,
      );
      await queryRunner.query(
        `UPDATE "${table}" SET "updated_on" = COALESCE("updated_on", "created_on")`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "updated_on" SET NOT NULL`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" RENAME COLUMN "updated_on" TO "updated_at"`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" RENAME COLUMN "created_on" TO "created_at"`,
      );
    }

    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "last_name"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "first_name"`,
    );

    // Note: cannot drop a Postgres enum value once added. The 'super_admin' value remains.
  }
}
