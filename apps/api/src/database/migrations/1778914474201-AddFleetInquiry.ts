import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFleetInquiry1778914474201 implements MigrationInterface {
    name = 'AddFleetInquiry1778914474201'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."vehicles_vehicle_type_enum" RENAME TO "vehicles_vehicle_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."vehicles_vehicle_type_enum" AS ENUM('car', 'suv', 'small_van', 'large_van', 'other')`);
        await queryRunner.query(`ALTER TABLE "vehicles" ALTER COLUMN "vehicle_type" TYPE "public"."vehicles_vehicle_type_enum" USING "vehicle_type"::"text"::"public"."vehicles_vehicle_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."vehicles_vehicle_type_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."vehicles_vehicle_type_enum_old" AS ENUM('car', 'van', 'suv', 'other')`);
        await queryRunner.query(`ALTER TABLE "vehicles" ALTER COLUMN "vehicle_type" TYPE "public"."vehicles_vehicle_type_enum_old" USING "vehicle_type"::"text"::"public"."vehicles_vehicle_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."vehicles_vehicle_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."vehicles_vehicle_type_enum_old" RENAME TO "vehicles_vehicle_type_enum"`);
    }

}
