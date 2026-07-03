import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditTrailTable1783199074000 implements MigrationInterface {
  name = 'AddAuditTrailTable1783199074000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "audit_trail" (
        "audit_id"      uuid        NOT NULL DEFAULT uuidv7(),
        "actor_id"      uuid        NOT NULL,
        "entity_type"   varchar(50) NOT NULL,
        "entity_id"     uuid        NOT NULL,
        "action"        varchar(80) NOT NULL,
        "old_values"    jsonb,
        "new_values"    jsonb,
        "performed_at"  timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_trail" PRIMARY KEY ("audit_id"),
        CONSTRAINT "FK_audit_trail_actor" FOREIGN KEY ("actor_id")
          REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_audit_trail_actor"  ON "audit_trail" ("actor_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_audit_trail_entity" ON "audit_trail" ("entity_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_audit_trail_action" ON "audit_trail" ("action")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_audit_trail_performed_at" ON "audit_trail" ("performed_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_audit_trail_performed_at"`);
    await queryRunner.query(`DROP INDEX "idx_audit_trail_action"`);
    await queryRunner.query(`DROP INDEX "idx_audit_trail_entity"`);
    await queryRunner.query(`DROP INDEX "idx_audit_trail_actor"`);
    await queryRunner.query(`DROP TABLE "audit_trail"`);
  }
}
