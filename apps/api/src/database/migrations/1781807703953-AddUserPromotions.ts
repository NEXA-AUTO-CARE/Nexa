import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserPromotions1781807703953 implements MigrationInterface {
  name = 'AddUserPromotions1781807703953';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_promotions" ("user_id" uuid NOT NULL, "promotion_id" uuid NOT NULL, CONSTRAINT "PK_719a8b54d34a422da3d8110ae68" PRIMARY KEY ("user_id", "promotion_id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_promotions" ADD CONSTRAINT "FK_4dff6dac4b2c0a25bcd9b3c5138" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_promotions" ADD CONSTRAINT "FK_b6bee2301e43e312ed2c471a846" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("promotion_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_promotions" DROP CONSTRAINT "FK_b6bee2301e43e312ed2c471a846"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_promotions" DROP CONSTRAINT "FK_4dff6dac4b2c0a25bcd9b3c5138"`,
    );
    await queryRunner.query(`DROP TABLE "user_promotions"`);
  }
}
