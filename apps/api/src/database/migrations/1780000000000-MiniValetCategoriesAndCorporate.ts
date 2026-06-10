import { MigrationInterface, QueryRunner } from 'typeorm';

export class MiniValetCategoriesAndCorporate1780000000000 implements MigrationInterface {
  name = 'MiniValetCategoriesAndCorporate1780000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Re-map vehicle categories to the billable Mini Valet categories.
    await queryRunner.query(
      `ALTER TYPE "vehicles_vehicle_type_enum" RENAME TO "vehicles_vehicle_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "vehicles_vehicle_type_enum" AS ENUM ('regular', 'seven_seater_4x4', 'small_van', 'large_van')`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ALTER COLUMN "vehicle_type" TYPE "vehicles_vehicle_type_enum" USING (
        CASE "vehicle_type"::text
          WHEN 'car' THEN 'regular'
          WHEN 'suv' THEN 'seven_seater_4x4'
          WHEN 'van' THEN 'small_van'
          ELSE 'regular'
        END)::"vehicles_vehicle_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "vehicles_vehicle_type_enum_old"`);

    // 2. Legal consent captured at booking time.
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD "agreed_safe_space" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD "agreed_details_correct" boolean NOT NULL DEFAULT false`,
    );

    // 3. Corporate fleet enquiries (admin raises invoices off these).
    await queryRunner.query(
      `CREATE TABLE "corporate_fleet_enquiries" (
        "enquiry_id" uuid NOT NULL DEFAULT uuidv7(),
        "company_name" character varying(150) NOT NULL,
        "fleet_size" integer NOT NULL,
        "contact_person" character varying(120) NOT NULL,
        "business_email" character varying(255) NOT NULL,
        "business_phone" character varying(30) NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'new',
        "created_on" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" character varying(255),
        "updated_on" TIMESTAMP WITH TIME ZONE DEFAULT now(),
        "updated_by" character varying(255),
        "approved_on" TIMESTAMP WITH TIME ZONE,
        "approved_by" character varying(255),
        CONSTRAINT "PK_corporate_fleet_enquiries" PRIMARY KEY ("enquiry_id")
      )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "corporate_fleet_enquiries"`);
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN "agreed_details_correct"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN "agreed_safe_space"`,
    );

    await queryRunner.query(
      `ALTER TYPE "vehicles_vehicle_type_enum" RENAME TO "vehicles_vehicle_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "vehicles_vehicle_type_enum" AS ENUM ('car', 'van', 'suv', 'other')`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ALTER COLUMN "vehicle_type" TYPE "vehicles_vehicle_type_enum" USING (
        CASE "vehicle_type"::text
          WHEN 'regular' THEN 'car'
          WHEN 'seven_seater_4x4' THEN 'suv'
          WHEN 'small_van' THEN 'van'
          WHEN 'large_van' THEN 'van'
          ELSE 'other'
        END)::"vehicles_vehicle_type_enum"`,
    );
    await queryRunner.query(`DROP TYPE "vehicles_vehicle_type_enum_old"`);
  }
}
