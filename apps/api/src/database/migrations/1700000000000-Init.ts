import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1700000000000 implements MigrationInterface {
  name = 'Init1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(
      `CREATE TYPE "users_role_enum" AS ENUM ('customer', 'vendor', 'admin')`,
    );
    await queryRunner.query(
      `CREATE TYPE "vehicles_vehicle_type_enum" AS ENUM ('car', 'van', 'suv', 'other')`,
    );
    await queryRunner.query(
      `CREATE TYPE "bookings_service_type_enum" AS ENUM ('basic', 'full', 'premium')`,
    );
    await queryRunner.query(
      `CREATE TYPE "bookings_status_enum" AS ENUM ('booked', 'accepted', 'in_progress', 'completed', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TYPE "payments_status_enum" AS ENUM ('pending', 'captured', 'refunded')`,
    );
    await queryRunner.query(
      `CREATE TYPE "job_photos_photo_type_enum" AS ENUM ('before', 'after')`,
    );

    await queryRunner.query(`
      CREATE TABLE "users" (
        "user_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" varchar(255),
        "phone_number" varchar(20),
        "password_hash" varchar(255),
        "role" "users_role_enum" NOT NULL,
        "display_name" varchar(100) NOT NULL,
        "otp_verified" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_users_email" ON "users" ("email") WHERE "email" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_users_phone_number" ON "users" ("phone_number") WHERE "phone_number" IS NOT NULL`,
    );

    await queryRunner.query(`
      CREATE TABLE "vehicles" (
        "vehicle_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "owner_id" uuid NOT NULL,
        "registration_number" varchar(15) NOT NULL,
        "make" varchar(50) NOT NULL,
        "model" varchar(50) NOT NULL,
        "vehicle_type" "vehicles_vehicle_type_enum" NOT NULL,
        "colour" varchar(30),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_vehicles_owner" FOREIGN KEY ("owner_id") REFERENCES "users"("user_id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_vehicles_owner" ON "vehicles" ("owner_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "bookings" (
        "booking_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "vehicle_id" uuid NOT NULL,
        "vendor_id" uuid,
        "service_type" "bookings_service_type_enum" NOT NULL,
        "booking_time" timestamptz NOT NULL,
        "service_address" text NOT NULL,
        "latitude" numeric(10, 7),
        "longitude" numeric(10, 7),
        "price" numeric(10, 2) NOT NULL,
        "status" "bookings_status_enum" NOT NULL DEFAULT 'booked',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_bookings_customer" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT,
        CONSTRAINT "fk_bookings_vehicle" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("vehicle_id") ON DELETE CASCADE,
        CONSTRAINT "fk_bookings_vendor" FOREIGN KEY ("vendor_id") REFERENCES "users"("user_id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_bookings_user" ON "bookings" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_bookings_vendor" ON "bookings" ("vendor_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_bookings_status" ON "bookings" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_bookings_booking_time" ON "bookings" ("booking_time")`,
    );

    await queryRunner.query(`
      CREATE TABLE "payments" (
        "payment_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "booking_id" uuid NOT NULL,
        "stripe_payment_intent_id" varchar(255) NOT NULL,
        "amount" numeric(10, 2) NOT NULL,
        "platform_fee" numeric(10, 2) NOT NULL,
        "vendor_payout" numeric(10, 2) NOT NULL,
        "status" "payments_status_enum" NOT NULL DEFAULT 'pending',
        "paid_out_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_payments_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("booking_id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_payments_booking" ON "payments" ("booking_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "job_photos" (
        "photo_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "booking_id" uuid NOT NULL,
        "vendor_id" uuid NOT NULL,
        "photo_type" "job_photos_photo_type_enum" NOT NULL,
        "storage_url" text NOT NULL,
        "uploaded_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_job_photos_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("booking_id") ON DELETE CASCADE,
        CONSTRAINT "fk_job_photos_vendor" FOREIGN KEY ("vendor_id") REFERENCES "users"("user_id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_job_photos_booking" ON "job_photos" ("booking_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "reviews" (
        "review_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "booking_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "vendor_id" uuid NOT NULL,
        "rating" integer NOT NULL,
        "comment" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_reviews_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("booking_id") ON DELETE CASCADE,
        CONSTRAINT "fk_reviews_customer" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT,
        CONSTRAINT "fk_reviews_vendor" FOREIGN KEY ("vendor_id") REFERENCES "users"("user_id") ON DELETE RESTRICT,
        CONSTRAINT "ck_reviews_rating" CHECK ("rating" BETWEEN 1 AND 5)
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_reviews_booking" ON "reviews" ("booking_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "reviews"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "job_photos"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "bookings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vehicles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "job_photos_photo_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payments_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "bookings_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "bookings_service_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "vehicles_vehicle_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_role_enum"`);
  }
}
