import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationLogs1783335023310 implements MigrationInterface {
  name = 'AddNotificationLogs1783335023310';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "notification_logs" (
        "log_id"              uuid         NOT NULL DEFAULT uuidv7(),
        "user_id"             uuid,
        "recipient"           varchar(255) NOT NULL,
        "channel"             varchar(50)  NOT NULL,
        "provider"            varchar(50)  NOT NULL,
        "provider_message_id" varchar(255),
        "status"              varchar(50)  NOT NULL DEFAULT 'sent',
        "event_type"          varchar(100),
        "subject"             text,
        "body"                text,
        "error_message"       text,
        "metadata"            jsonb,
        "created_at"          timestamptz  NOT NULL DEFAULT now(),
        "updated_at"          timestamptz,
        CONSTRAINT "PK_notification_logs" PRIMARY KEY ("log_id"),
        CONSTRAINT "FK_notification_logs_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_notification_logs_user_id" ON "notification_logs" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_notification_logs_provider_msg_id" ON "notification_logs" ("provider_message_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_notification_logs_status" ON "notification_logs" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_notification_logs_channel" ON "notification_logs" ("channel")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_notification_logs_created_at" ON "notification_logs" ("created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_notification_logs_created_at"`);
    await queryRunner.query(`DROP INDEX "idx_notification_logs_channel"`);
    await queryRunner.query(`DROP INDEX "idx_notification_logs_status"`);
    await queryRunner.query(`DROP INDEX "idx_notification_logs_provider_msg_id"`);
    await queryRunner.query(`DROP INDEX "idx_notification_logs_user_id"`);
    await queryRunner.query(`DROP TABLE "notification_logs"`);
  }
}
