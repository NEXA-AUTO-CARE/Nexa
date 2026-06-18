import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddServicePhoneToBooking1781529760041 implements MigrationInterface {
  name = 'AddServicePhoneToBooking1781529760041';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD "service_phone" character varying(30)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP COLUMN "service_phone"`,
    );
  }
}
