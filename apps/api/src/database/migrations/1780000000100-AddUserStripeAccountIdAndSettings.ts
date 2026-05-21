import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserStripeAccountIdAndSettings1780000000100 implements MigrationInterface {
  name = 'AddUserStripeAccountIdAndSettings1780000000100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "stripe_account_id" character varying(255)`);
    await queryRunner.query(`
      CREATE TABLE "system_settings" (
        "key" character varying(100) NOT NULL,
        "value" text NOT NULL,
        "created_on" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" character varying(255),
        "updated_on" TIMESTAMP WITH TIME ZONE DEFAULT now(),
        "updated_by" character varying(255),
        "approved_on" TIMESTAMP WITH TIME ZONE,
        "approved_by" character varying(255),
        CONSTRAINT "PK_system_settings" PRIMARY KEY ("key")
      )
    `);

    // Remap enum values to the new classification naming: standard, grande, maxi, transit.
    await queryRunner.query(`ALTER TYPE "vehicles_vehicle_type_enum" RENAME TO "vehicles_vehicle_type_enum_old"`);
    await queryRunner.query(`CREATE TYPE "vehicles_vehicle_type_enum" AS ENUM ('standard', 'grande', 'maxi', 'transit')`);
    await queryRunner.query(`
      ALTER TABLE "vehicles" ALTER COLUMN "vehicle_type" TYPE "vehicles_vehicle_type_enum" USING (
        CASE "vehicle_type"::text
          WHEN 'regular' THEN 'standard'::"vehicles_vehicle_type_enum"
          WHEN 'seven_seater_4x4' THEN 'grande'::"vehicles_vehicle_type_enum"
          WHEN 'small_van' THEN 'maxi'::"vehicles_vehicle_type_enum"
          WHEN 'large_van' THEN 'transit'::"vehicles_vehicle_type_enum"
          ELSE 'standard'::"vehicles_vehicle_type_enum"
        END
      )
    `);
    await queryRunner.query(`DROP TYPE "vehicles_vehicle_type_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "system_settings"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "stripe_account_id"`);

    await queryRunner.query(`ALTER TYPE "vehicles_vehicle_type_enum" RENAME TO "vehicles_vehicle_type_enum_old"`);
    await queryRunner.query(`CREATE TYPE "vehicles_vehicle_type_enum" AS ENUM ('regular', 'seven_seater_4x4', 'small_van', 'large_van')`);
    await queryRunner.query(`
      ALTER TABLE "vehicles" ALTER COLUMN "vehicle_type" TYPE "vehicles_vehicle_type_enum" USING (
        CASE "vehicle_type"::text
          WHEN 'standard' THEN 'regular'::"vehicles_vehicle_type_enum"
          WHEN 'grande' THEN 'seven_seater_4x4'::"vehicles_vehicle_type_enum"
          WHEN 'maxi' THEN 'small_van'::"vehicles_vehicle_type_enum"
          WHEN 'transit' THEN 'large_van'::"vehicles_vehicle_type_enum"
          ELSE 'regular'::"vehicles_vehicle_type_enum"
        END
      )
    `);
    await queryRunner.query(`DROP TYPE "vehicles_vehicle_type_enum_old"`);
  }
}
