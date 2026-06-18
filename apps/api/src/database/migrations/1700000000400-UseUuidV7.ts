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
    // Install a portable uuidv7() function if not already provided natively
    // (native uuidv7() ships with PostgreSQL 17+; RDS may run an earlier version).
    // Uses clock_timestamp() for ms-precision timestamps + gen_random_bytes() for
    // the random tail, then stamps the v7 version nibble and the 10xx variant bits.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION uuidv7() RETURNS uuid
      LANGUAGE plpgsql AS $$
      DECLARE
        ts_ms bigint := (extract(epoch FROM clock_timestamp()) * 1000)::bigint;
        b     bytea  := decode(lpad(to_hex(ts_ms), 12, '0'), 'hex') || gen_random_bytes(10);
      BEGIN
        b := set_byte(b, 6, (get_byte(b, 6) & x'0f'::int) | x'70'::int);
        b := set_byte(b, 8, (get_byte(b, 8) & x'3f'::int) | x'80'::int);
        RETURN encode(b, 'hex')::uuid;
      END;
      $$;
    `);

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
    await queryRunner.query(
      `ALTER TABLE "users"            ALTER COLUMN "user_id"            SET DEFAULT uuidv7()`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles"         ALTER COLUMN "vehicle_id"         SET DEFAULT uuidv7()`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings"         ALTER COLUMN "booking_id"         SET DEFAULT uuidv7()`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments"         ALTER COLUMN "payment_id"         SET DEFAULT uuidv7()`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_photos"       ALTER COLUMN "photo_id"           SET DEFAULT uuidv7()`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews"          ALTER COLUMN "review_id"          SET DEFAULT uuidv7()`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles"            ALTER COLUMN "role_id"            SET DEFAULT uuidv7()`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ALTER COLUMN "role_permission_id" SET DEFAULT uuidv7()`,
    );
    await queryRunner.query(
      `ALTER TABLE "otp_codes"        ALTER COLUMN "id"                 SET DEFAULT uuidv7()`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens"   ALTER COLUMN "id"                 SET DEFAULT uuidv7()`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
