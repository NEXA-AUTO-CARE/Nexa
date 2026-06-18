import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVerifiedAddressColumns1781805808376 implements MigrationInterface {
  name = 'AddVerifiedAddressColumns1781805808376';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD "address_line_1" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD "address_line_2" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD "address_line_3" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD "post_town" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD "postcode" character varying(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD "uprn" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "vendor_profiles" ADD "address_line_1" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "vendor_profiles" ADD "address_line_2" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "vendor_profiles" ADD "address_line_3" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "vendor_profiles" ADD "post_town" character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "vendor_profiles" ADD "postcode" character varying(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "vendor_profiles" ADD "uprn" character varying(50)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "vendor_profiles" DROP COLUMN "uprn"`);
    await queryRunner.query(
      `ALTER TABLE "vendor_profiles" DROP COLUMN "postcode"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vendor_profiles" DROP COLUMN "post_town"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vendor_profiles" DROP COLUMN "address_line_3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vendor_profiles" DROP COLUMN "address_line_2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vendor_profiles" DROP COLUMN "address_line_1"`,
    );
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "uprn"`);
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "postcode"`);
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "post_town"`);
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN "address_line_3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN "address_line_2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN "address_line_1"`,
    );
  }
}
