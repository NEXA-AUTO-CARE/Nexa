import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBookingReference1783115884072 implements MigrationInterface {
    name = 'AddBookingReference1783115884072'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "audit_trail" DROP CONSTRAINT "FK_audit_trail_actor"`);
        await queryRunner.query(`DROP INDEX "public"."idx_audit_trail_performed_at"`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "transaction_reference" character varying(50) NOT NULL DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "UQ_ed7060f04402306c58a2f47bd74" UNIQUE ("transaction_reference")`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD "booking_reference" character varying(50) NOT NULL DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD CONSTRAINT "UQ_5ba137683172608bf22d69538a0" UNIQUE ("booking_reference")`);
        await queryRunner.query(`CREATE TYPE "public"."bookings_payment_status_enum" AS ENUM('pending', 'processing', 'captured', 'failed', 'refunded')`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD "payment_status" "public"."bookings_payment_status_enum" NOT NULL DEFAULT 'pending'`);
        await queryRunner.query(`ALTER TYPE "public"."payments_status_enum" RENAME TO "payments_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."payments_status_enum" AS ENUM('pending', 'processing', 'captured', 'failed', 'refunded')`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "status" TYPE "public"."payments_status_enum" USING "status"::"text"::"public"."payments_status_enum"`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."payments_status_enum_old"`);
        await queryRunner.query(`ALTER TYPE "public"."bookings_status_enum" RENAME TO "bookings_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."bookings_status_enum" AS ENUM('booked', 'assigned', 'accepted', 'in_progress', 'completed', 'cancelled')`);
        await queryRunner.query(`ALTER TABLE "bookings" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "bookings" ALTER COLUMN "status" TYPE "public"."bookings_status_enum" USING "status"::"text"::"public"."bookings_status_enum"`);
        await queryRunner.query(`ALTER TABLE "bookings" ALTER COLUMN "status" SET DEFAULT 'booked'`);
        await queryRunner.query(`DROP TYPE "public"."bookings_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "audit_trail" ADD CONSTRAINT "FK_125f2e2c1f70ff906f5db7c023c" FOREIGN KEY ("actor_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "audit_trail" DROP CONSTRAINT "FK_125f2e2c1f70ff906f5db7c023c"`);
        await queryRunner.query(`CREATE TYPE "public"."bookings_status_enum_old" AS ENUM('booked', 'accepted', 'in_progress', 'completed', 'cancelled')`);
        await queryRunner.query(`ALTER TABLE "bookings" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "bookings" ALTER COLUMN "status" TYPE "public"."bookings_status_enum_old" USING "status"::"text"::"public"."bookings_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "bookings" ALTER COLUMN "status" SET DEFAULT 'booked'`);
        await queryRunner.query(`DROP TYPE "public"."bookings_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."bookings_status_enum_old" RENAME TO "bookings_status_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."payments_status_enum_old" AS ENUM('pending', 'captured', 'refunded')`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "status" TYPE "public"."payments_status_enum_old" USING "status"::"text"::"public"."payments_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."payments_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."payments_status_enum_old" RENAME TO "payments_status_enum"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "payment_status"`);
        await queryRunner.query(`DROP TYPE "public"."bookings_payment_status_enum"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP CONSTRAINT "UQ_5ba137683172608bf22d69538a0"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "booking_reference"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "UQ_ed7060f04402306c58a2f47bd74"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "transaction_reference"`);
        await queryRunner.query(`CREATE INDEX "idx_audit_trail_performed_at" ON "audit_trail" ("performed_at") `);
        await queryRunner.query(`ALTER TABLE "audit_trail" ADD CONSTRAINT "FK_audit_trail_actor" FOREIGN KEY ("actor_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
