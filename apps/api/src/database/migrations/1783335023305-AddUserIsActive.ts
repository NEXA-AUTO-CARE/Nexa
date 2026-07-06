import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserIsActive1783335023305 implements MigrationInterface {
    name = 'AddUserIsActive1783335023305'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payments" ADD "transaction_reference" character varying(50) NOT NULL DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "UQ_ed7060f04402306c58a2f47bd74" UNIQUE ("transaction_reference")`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD "booking_reference" character varying(50) NOT NULL DEFAULT gen_random_uuid()`);
        await queryRunner.query(`ALTER TABLE "bookings" ADD CONSTRAINT "UQ_5ba137683172608bf22d69538a0" UNIQUE ("booking_reference")`);
        await queryRunner.query(`ALTER TABLE "users" ADD "is_active" boolean NOT NULL DEFAULT true`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "is_active"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP CONSTRAINT "UQ_5ba137683172608bf22d69538a0"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "booking_reference"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "UQ_ed7060f04402306c58a2f47bd74"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "transaction_reference"`);
    }

}
