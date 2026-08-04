import { MigrationInterface, QueryRunner } from "typeorm";

export class ConvertVehicleTypeToVarchar1783335023307 implements MigrationInterface {
    name = 'ConvertVehicleTypeToVarchar1783335023307';

    public async up(queryRunner: QueryRunner): Promise<void> {
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
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // No-op for safety
    }
}
