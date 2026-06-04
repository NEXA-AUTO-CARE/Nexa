import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPromotions1780000000200 implements MigrationInterface {
  name = 'AddPromotions1780000000200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enums
    await queryRunner.query(`CREATE TYPE "promotions_type_enum" AS ENUM ('announcement', 'percentage_discount', 'bonanza')`);
    await queryRunner.query(`CREATE TYPE "promotions_status_enum" AS ENUM ('draft', 'active', 'ended')`);

    // Promotions table
    await queryRunner.query(`
      CREATE TABLE "promotions" (
        "promotion_id"      UUID NOT NULL DEFAULT uuidv7(),
        "title"             VARCHAR(255) NOT NULL,
        "message"           TEXT NOT NULL,
        "type"              "promotions_type_enum" NOT NULL DEFAULT 'announcement',
        "status"            "promotions_status_enum" NOT NULL DEFAULT 'draft',
        "discount_percent"  DECIMAL(5,2),
        "bonanza_threshold" INTEGER,
        "bonanza_recurring" BOOLEAN NOT NULL DEFAULT false,
        "start_date"        TIMESTAMPTZ,
        "end_date"          TIMESTAMPTZ,
        "started_at"        TIMESTAMPTZ,
        "ended_at"          TIMESTAMPTZ,
        "started_by_id"     UUID REFERENCES "users"("user_id") ON DELETE SET NULL,
        "ended_by_id"       UUID REFERENCES "users"("user_id") ON DELETE SET NULL,
        "created_on"        TIMESTAMPTZ NOT NULL DEFAULT now(),
        "created_by"        VARCHAR(255),
        "updated_on"        TIMESTAMPTZ DEFAULT now(),
        "updated_by"        VARCHAR(255),
        "approved_on"       TIMESTAMPTZ,
        "approved_by"       VARCHAR(255),
        CONSTRAINT "PK_promotions" PRIMARY KEY ("promotion_id")
      )
    `);

    // Promotion redemptions tracking table
    await queryRunner.query(`
      CREATE TABLE "promotion_redemptions" (
        "redemption_id"     UUID NOT NULL DEFAULT uuidv7(),
        "promotion_id"      UUID NOT NULL REFERENCES "promotions"("promotion_id") ON DELETE CASCADE,
        "user_id"           UUID NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE,
        "booking_id"        UUID NOT NULL REFERENCES "bookings"("booking_id") ON DELETE CASCADE,
        "discount_amount"   DECIMAL(10,2) NOT NULL DEFAULT 0,
        "is_free_booking"   BOOLEAN NOT NULL DEFAULT false,
        "redeemed_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_promotion_redemptions" PRIMARY KEY ("redemption_id"),
        CONSTRAINT "UQ_promo_user_booking" UNIQUE ("promotion_id", "user_id", "booking_id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_redemption_promo_user" ON "promotion_redemptions" ("promotion_id", "user_id")`);

    // Add promotion tracking columns to bookings
    await queryRunner.query(`ALTER TABLE "bookings" ADD "promotion_id" UUID REFERENCES "promotions"("promotion_id") ON DELETE SET NULL`);
    await queryRunner.query(`ALTER TABLE "bookings" ADD "original_price" DECIMAL(10,2)`);
    await queryRunner.query(`ALTER TABLE "bookings" ADD "discount_amount" DECIMAL(10,2)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove booking columns
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "discount_amount"`);
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "original_price"`);
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "promotion_id"`);

    // Drop tables
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_redemption_promo_user"`);
    await queryRunner.query(`DROP TABLE "promotion_redemptions"`);
    await queryRunner.query(`DROP TABLE "promotions"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE "promotions_status_enum"`);
    await queryRunner.query(`DROP TYPE "promotions_type_enum"`);
  }
}
