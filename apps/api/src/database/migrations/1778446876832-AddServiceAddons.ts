import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddServiceAddons1778446876832 implements MigrationInterface {
  name = 'AddServiceAddons1778446876832';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "job_photos" DROP CONSTRAINT "fk_job_photos_booking"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_photos" DROP CONSTRAINT "fk_job_photos_vendor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "fk_payments_booking"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT "fk_reviews_booking"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT "fk_reviews_customer"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT "fk_reviews_vendor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" DROP CONSTRAINT "fk_vehicles_owner"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP CONSTRAINT "fk_bookings_customer"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP CONSTRAINT "fk_bookings_vehicle"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP CONSTRAINT "fk_bookings_vendor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "fk_role_permissions_role"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "fk_users_role"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "fk_refresh_tokens_user"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_job_photos_booking"`);
    await queryRunner.query(`DROP INDEX "public"."idx_vehicles_owner"`);
    await queryRunner.query(`DROP INDEX "public"."idx_bookings_user"`);
    await queryRunner.query(`DROP INDEX "public"."idx_bookings_vendor"`);
    await queryRunner.query(`DROP INDEX "public"."idx_bookings_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_bookings_booking_time"`);
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT "ck_reviews_rating"`,
    );
    await queryRunner.query(
      `CREATE TABLE "service_addons" ("addon_id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" text, "price" numeric(10,2) NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_7a4ec43dd251c256280a8521a88" UNIQUE ("name"), CONSTRAINT "PK_75c6f86f9142c8ecb2901c515a7" PRIMARY KEY ("addon_id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD "addons" jsonb DEFAULT '[]'`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_photos" ALTER COLUMN "updated_on" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "updated_on" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "UQ_e86edf76dc2424f123b9023a2b2" UNIQUE ("booking_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ALTER COLUMN "updated_on" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "UQ_bbd6ac6e3e6a8f8c6e0e8692d63" UNIQUE ("booking_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ALTER COLUMN "updated_on" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ALTER COLUMN "updated_on" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ALTER COLUMN "updated_on" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" ALTER COLUMN "updated_on" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "updated_on" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "otp_codes" ALTER COLUMN "updated_on" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ALTER COLUMN "updated_on" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "CHK_2ea381a5c2f8bef0073a48f6bd" CHECK ("rating" BETWEEN 1 AND 5)`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_photos" ADD CONSTRAINT "FK_df50320ff5cf178f588d6242f25" FOREIGN KEY ("booking_id") REFERENCES "bookings"("booking_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_photos" ADD CONSTRAINT "FK_8fc62eff09afc8be1c045575233" FOREIGN KEY ("vendor_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_e86edf76dc2424f123b9023a2b2" FOREIGN KEY ("booking_id") REFERENCES "bookings"("booking_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "FK_bbd6ac6e3e6a8f8c6e0e8692d63" FOREIGN KEY ("booking_id") REFERENCES "bookings"("booking_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "FK_728447781a30bc3fcfe5c2f1cdf" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "FK_9ac2c42bb939e88ca13e0c6b288" FOREIGN KEY ("vendor_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD CONSTRAINT "FK_490a6fd6eb12a0a64e87b534dd9" FOREIGN KEY ("owner_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD CONSTRAINT "FK_64cd97487c5c42806458ab5520c" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD CONSTRAINT "FK_314ee41921742fb13c9309e4054" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("vehicle_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD CONSTRAINT "FK_0356b37bc1a2100608a4dfdab92" FOREIGN KEY ("vendor_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_178199805b901ccd220ab7740ec" FOREIGN KEY ("role_id") REFERENCES "roles"("role_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1" FOREIGN KEY ("role_id") REFERENCES "roles"("role_id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_178199805b901ccd220ab7740ec"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP CONSTRAINT "FK_0356b37bc1a2100608a4dfdab92"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP CONSTRAINT "FK_314ee41921742fb13c9309e4054"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP CONSTRAINT "FK_64cd97487c5c42806458ab5520c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" DROP CONSTRAINT "FK_490a6fd6eb12a0a64e87b534dd9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT "FK_9ac2c42bb939e88ca13e0c6b288"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT "FK_728447781a30bc3fcfe5c2f1cdf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT "FK_bbd6ac6e3e6a8f8c6e0e8692d63"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_e86edf76dc2424f123b9023a2b2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_photos" DROP CONSTRAINT "FK_8fc62eff09afc8be1c045575233"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_photos" DROP CONSTRAINT "FK_df50320ff5cf178f588d6242f25"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT "CHK_2ea381a5c2f8bef0073a48f6bd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ALTER COLUMN "updated_on" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "otp_codes" ALTER COLUMN "updated_on" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "updated_on" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" ALTER COLUMN "updated_on" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ALTER COLUMN "updated_on" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ALTER COLUMN "updated_on" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ALTER COLUMN "updated_on" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" DROP CONSTRAINT "UQ_bbd6ac6e3e6a8f8c6e0e8692d63"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ALTER COLUMN "updated_on" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "UQ_e86edf76dc2424f123b9023a2b2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ALTER COLUMN "updated_on" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_photos" ALTER COLUMN "updated_on" DROP DEFAULT`,
    );
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "addons"`);
    await queryRunner.query(`DROP TABLE "service_addons"`);
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "ck_reviews_rating" CHECK (((rating >= 1) AND (rating <= 5)))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_bookings_booking_time" ON "bookings" ("booking_time") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_bookings_status" ON "bookings" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_bookings_vendor" ON "bookings" ("vendor_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_bookings_user" ON "bookings" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_vehicles_owner" ON "vehicles" ("owner_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_job_photos_booking" ON "job_photos" ("booking_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "fk_refresh_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "fk_users_role" FOREIGN KEY ("role_id") REFERENCES "roles"("role_id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "fk_role_permissions_role" FOREIGN KEY ("role_id") REFERENCES "roles"("role_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD CONSTRAINT "fk_bookings_vendor" FOREIGN KEY ("vendor_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD CONSTRAINT "fk_bookings_vehicle" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("vehicle_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD CONSTRAINT "fk_bookings_customer" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD CONSTRAINT "fk_vehicles_owner" FOREIGN KEY ("owner_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "fk_reviews_vendor" FOREIGN KEY ("vendor_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "fk_reviews_customer" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reviews" ADD CONSTRAINT "fk_reviews_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("booking_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "fk_payments_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("booking_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_photos" ADD CONSTRAINT "fk_job_photos_vendor" FOREIGN KEY ("vendor_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_photos" ADD CONSTRAINT "fk_job_photos_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("booking_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
