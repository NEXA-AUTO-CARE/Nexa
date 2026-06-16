import { MigrationInterface, QueryRunner } from "typeorm";

export class VendorProfile1781183776431 implements MigrationInterface {
    name = 'VendorProfile1781183776431'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."vendor_profiles_approval_status_enum" AS ENUM('PENDING', 'ACTIVE', 'SUSPENDED')`);
        await queryRunner.query(`CREATE TABLE "vendor_profiles" ("created_on" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "created_by" character varying(255), "updated_on" TIMESTAMP WITH TIME ZONE DEFAULT now(), "updated_by" character varying(255), "approved_on" TIMESTAMP WITH TIME ZONE, "approved_by" character varying(255), "vendor_id" uuid NOT NULL, "approval_status" "public"."vendor_profiles_approval_status_enum" NOT NULL DEFAULT 'PENDING', "latitude" numeric(10,7), "longitude" numeric(10,7), "company_name" character varying(255), CONSTRAINT "PK_1f5076ae25966a5594e90b41b96" PRIMARY KEY ("vendor_id"))`);
        await queryRunner.query(`ALTER TABLE "vendor_profiles" ADD CONSTRAINT "FK_1f5076ae25966a5594e90b41b96" FOREIGN KEY ("vendor_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "vendor_profiles" DROP CONSTRAINT "FK_1f5076ae25966a5594e90b41b96"`);
        await queryRunner.query(`DROP TABLE "vendor_profiles"`);
        await queryRunner.query(`DROP TYPE "public"."vendor_profiles_approval_status_enum"`);
    }

}
