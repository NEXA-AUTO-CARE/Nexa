import { MigrationInterface, QueryRunner } from 'typeorm';

export class SanitizeUserAndOtpIdentifiers1783335023309
  implements MigrationInterface
{
  name = 'SanitizeUserAndOtpIdentifiers1783335023309';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Sanitize all user emails to lowercase and trimmed
    await queryRunner.query(`
      UPDATE "users"
      SET "email" = LOWER(TRIM("email"))
      WHERE "email" IS NOT NULL;
    `);

    // 2. Sanitize all user phone numbers by stripping whitespace
    await queryRunner.query(`
      UPDATE "users"
      SET "phone_number" = REGEXP_REPLACE("phone_number", '\\s+', '', 'g')
      WHERE "phone_number" IS NOT NULL;
    `);

    // 3. Sanitize OTP code identifiers: lowercase emails, strip spaces from phone numbers
    await queryRunner.query(`
      UPDATE "otp_codes"
      SET "identifier" = LOWER(TRIM("identifier"))
      WHERE "identifier" LIKE '%@%';
    `);

    await queryRunner.query(`
      UPDATE "otp_codes"
      SET "identifier" = REGEXP_REPLACE("identifier", '\\s+', '', 'g')
      WHERE "identifier" NOT LIKE '%@%';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Data sanitization changes are irreversible and intentionally permanent
  }
}
