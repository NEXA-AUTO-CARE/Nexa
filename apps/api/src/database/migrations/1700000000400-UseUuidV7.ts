import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Switches all primary-key column defaults from gen_random_uuid() (UUID v4)
 * to the PostgreSQL 18 native uuidv7() function (UUID v7).
 *
 * UUID v7 is time-ordered (ms-precision Unix timestamp in the high bits),
 * which eliminates random B-tree page splits on insert-heavy workloads.
 *
 * All entity tables are truncated first so the database contains only
 * time-ordered identifiers going forward.
 */
export class UseUuidV71700000000400 implements MigrationInterface {
  name = 'UseUuidV71700000000400';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Wipe all entity tables; CASCADE handles FK ordering automatically.
    // The migrations table is intentionally excluded.
    await queryRunner.query(`
      TRUNCATE TABLE
        "role_permissions",
        "refresh_tokens",
        "otp_codes",
        "reviews",
        "job_photos",
        "payments",
        "bookings",
        "vehicles",
        "users",
        "roles"
      CASCADE
    `);

    // Swap every PK default from gen_random_uuid() → uuidv7()
    await queryRunner.query(`ALTER TABLE "users"            ALTER COLUMN "user_id"            SET DEFAULT uuidv7()`);
    await queryRunner.query(`ALTER TABLE "vehicles"         ALTER COLUMN "vehicle_id"         SET DEFAULT uuidv7()`);
    await queryRunner.query(`ALTER TABLE "bookings"         ALTER COLUMN "booking_id"         SET DEFAULT uuidv7()`);
    await queryRunner.query(`ALTER TABLE "payments"         ALTER COLUMN "payment_id"         SET DEFAULT uuidv7()`);
    await queryRunner.query(`ALTER TABLE "job_photos"       ALTER COLUMN "photo_id"           SET DEFAULT uuidv7()`);
    await queryRunner.query(`ALTER TABLE "reviews"          ALTER COLUMN "review_id"          SET DEFAULT uuidv7()`);
    await queryRunner.query(`ALTER TABLE "roles"            ALTER COLUMN "role_id"            SET DEFAULT uuidv7()`);
    await queryRunner.query(`ALTER TABLE "role_permissions" ALTER COLUMN "role_permission_id" SET DEFAULT uuidv7()`);
    await queryRunner.query(`ALTER TABLE "otp_codes"        ALTER COLUMN "id"                 SET DEFAULT uuidv7()`);
    await queryRunner.query(`ALTER TABLE "refresh_tokens"   ALTER COLUMN "id"                 SET DEFAULT uuidv7()`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    
  }
}
