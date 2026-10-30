import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBookingReference1783115884072 implements MigrationInterface {
  name = 'AddBookingReference1783115884072';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create payment status enum if it doesn't exist
    await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bookings_payment_status_enum') THEN
                    CREATE TYPE "public"."bookings_payment_status_enum" AS ENUM('pending', 'captured', 'refunded');
                END IF;
            END $$;
        `);

    // Add payment_status column to bookings
    await queryRunner.query(`
            ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "payment_status" "public"."bookings_payment_status_enum" NOT NULL DEFAULT 'pending';
        `);

    // Add booking_reference column to bookings
    await queryRunner.query(`
            ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "booking_reference" varchar(50);
        `);

    // Populate existing bookings with a reference if NULL
    await queryRunner.query(`
            UPDATE "bookings" 
            SET "booking_reference" = 'BKG-' || UPPER(SUBSTRING(REPLACE("booking_id"::text, '-', ''), 1, 8))
            WHERE "booking_reference" IS NULL;
        `);

    // Set default and unique constraint on booking_reference
    await queryRunner.query(`
            ALTER TABLE "bookings" ALTER COLUMN "booking_reference" SET DEFAULT gen_random_uuid();
        `);

    await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'UQ_5ba137683172608bf22d69538a0'
                ) THEN
                    ALTER TABLE "bookings" ADD CONSTRAINT "UQ_5ba137683172608bf22d69538a0" UNIQUE ("booking_reference");
                END IF;
            END $$;
        `);

    // Add transaction_reference column to payments
    await queryRunner.query(`
            ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "transaction_reference" varchar(50);
        `);

    // Populate existing payments with a transaction reference if NULL
    await queryRunner.query(`
            UPDATE "payments" 
            SET "transaction_reference" = 'TXN-' || UPPER(SUBSTRING(REPLACE("payment_id"::text, '-', ''), 1, 8))
            WHERE "transaction_reference" IS NULL;
        `);

    // Set default and unique constraint on transaction_reference
    await queryRunner.query(`
            ALTER TABLE "payments" ALTER COLUMN "transaction_reference" SET DEFAULT gen_random_uuid();
        `);

    await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'UQ_ed7060f04402306c58a2f47bd74'
                ) THEN
                    ALTER TABLE "payments" ADD CONSTRAINT "UQ_ed7060f04402306c58a2f47bd74" UNIQUE ("transaction_reference");
                END IF;
            END $$;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "audit_trail" DROP CONSTRAINT "FK_125f2e2c1f70ff906f5db7c023c"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."bookings_status_enum_old" AS ENUM('booked', 'accepted', 'in_progress', 'completed', 'cancelled')`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ALTER COLUMN "status" TYPE "public"."bookings_status_enum_old" USING "status"::"text"::"public"."bookings_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ALTER COLUMN "status" SET DEFAULT 'booked'`,
    );
    await queryRunner.query(`DROP TYPE "public"."bookings_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."bookings_status_enum_old" RENAME TO "bookings_status_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payments_status_enum_old" AS ENUM('pending', 'captured', 'refunded')`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "status" TYPE "public"."payments_status_enum_old" USING "status"::"text"::"public"."payments_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "status" SET DEFAULT 'pending'`,
    );
    await queryRunner.query(`DROP TYPE "public"."payments_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."payments_status_enum_old" RENAME TO "payments_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN "payment_status"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."bookings_payment_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP CONSTRAINT "UQ_5ba137683172608bf22d69538a0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN "booking_reference"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "UQ_ed7060f04402306c58a2f47bd74"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN "transaction_reference"`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_audit_trail_performed_at" ON "audit_trail" ("performed_at") `,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_trail" ADD CONSTRAINT "FK_audit_trail_actor" FOREIGN KEY ("actor_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }
}
