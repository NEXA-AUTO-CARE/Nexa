import { MigrationInterface, QueryRunner } from "typeorm";

export class EnsureBookingReferenceColumns1783335023306 implements MigrationInterface {
    name = 'EnsureBookingReferenceColumns1783335023306';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create payment status enum if it doesn't exist
        await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bookings_payment_status_enum') THEN
                    CREATE TYPE "public"."bookings_payment_status_enum" AS ENUM('pending', 'captured', 'refunded');
                END IF;
            END $$;
        `);

        // Add payment_status column to bookings if missing
        await queryRunner.query(`
            ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "payment_status" "public"."bookings_payment_status_enum" NOT NULL DEFAULT 'pending';
        `);

        // Add booking_reference column to bookings if missing
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

        // Add transaction_reference column to payments if missing
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
        await queryRunner.query(`
            DO $$ BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'vehicles' 
                      AND column_name = 'vehicle_type' 
                      AND udt_name LIKE '%enum%'
                ) THEN
                    ALTER TABLE "vehicles" ALTER COLUMN "vehicle_type" TYPE varchar(50) USING "vehicle_type"::text;
                    DROP TYPE IF EXISTS "vehicles_vehicle_type_enum" CASCADE;
                    DROP TYPE IF EXISTS "vehicles_vehicle_type_enum_old" CASCADE;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            UPDATE "vehicles" SET "vehicle_type" = 'small_car' WHERE "vehicle_type" IN ('standard', 'regular', 'car');
            UPDATE "vehicles" SET "vehicle_type" = 'family_car' WHERE "vehicle_type" IN ('grande', 'seven_seater_4x4');
            UPDATE "vehicles" SET "vehicle_type" = 'large_suv_van' WHERE "vehicle_type" IN ('maxi', 'transit', 'small_van', 'large_van', 'suv', 'van');

            UPDATE "service_addons" SET "price" = 24.99 WHERE LOWER("name") = 'seat shampoo';
            UPDATE "service_addons" SET "price" = 9.99 WHERE LOWER("name") = 'floor shampoo';
            UPDATE "service_addons" SET "price" = 8.99 WHERE LOWER("name") IN ('tyre dress', 'tyre shine');
            UPDATE "service_addons" SET "price" = 19.99 WHERE LOWER("name") = 'pet hair removal';
            UPDATE "service_addons" SET "price" = 29.99 WHERE LOWER("name") = 'polish';
            UPDATE "service_addons" SET "price" = 14.99 WHERE LOWER("name") = 'tar removal';
            UPDATE "service_addons" SET "price" = 39.99 WHERE LOWER("name") = 'deep interior clean';

            INSERT INTO "service_addons" ("name", "description", "price", "is_active")
            SELECT 'Deep Interior Clean', 'Comprehensive deep cleaning of all interior surfaces', 39.99, true
            WHERE NOT EXISTS (SELECT 1 FROM "service_addons" WHERE LOWER("name") = 'deep interior clean');
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // No-op for safety
    }
}
