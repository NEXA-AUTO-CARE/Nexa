import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateFleetInquiriesTable1778914916977 implements MigrationInterface {
    name = 'CreateFleetInquiriesTable1778914916977'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "fleet_inquiries" ("inquiry_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "company_name" character varying NOT NULL, "contact_person" character varying NOT NULL, "fleet_size" character varying NOT NULL, "business_email" character varying NOT NULL, "business_phone" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'PENDING', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_781a6e3366f1af23c01f1745e58" PRIMARY KEY ("inquiry_id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "fleet_inquiries"`);
    }

}
