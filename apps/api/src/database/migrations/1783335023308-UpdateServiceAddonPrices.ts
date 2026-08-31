import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateServiceAddonPrices1783335023308 implements MigrationInterface {
  name = 'UpdateServiceAddonPrices1783335023308';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            UPDATE "service_addons" SET "price" = 24.99 WHERE LOWER("name") = 'seat shampoo';
            UPDATE "service_addons" SET "price" = 9.99 WHERE LOWER("name") = 'floor shampoo';
            UPDATE "service_addons" SET "price" = 8.99 WHERE LOWER("name") IN ('tyre dress', 'tyre shine');
            UPDATE "service_addons" SET "price" = 19.99 WHERE LOWER("name") = 'pet hair removal';
            UPDATE "service_addons" SET "price" = 29.99 WHERE LOWER("name") = 'polish';
            UPDATE "service_addons" SET "price" = 14.99 WHERE LOWER("name") = 'tar removal';
            UPDATE "service_addons" SET "price" = 39.99 WHERE LOWER("name") = 'deep interior clean';

            INSERT INTO "service_addons" ("name", "description", "price", "is_active")
            SELECT 'Deep Interior Clean', 'Comprehensive deep cleaning of all interior surfaces', 39.99, true
            WHERE NOT EXISTS (SELECT 1 FROM "service_addons" WHERE LOWER("name") = 'deep interior clean');
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No-op
  }
}
