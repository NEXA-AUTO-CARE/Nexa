import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueVehicleConstraint1781529526811 implements MigrationInterface {
  name = 'AddUniqueVehicleConstraint1781529526811';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "promotion_redemptions" DROP CONSTRAINT "promotion_redemptions_booking_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "promotion_redemptions" DROP CONSTRAINT "promotion_redemptions_promotion_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "promotion_redemptions" DROP CONSTRAINT "promotion_redemptions_user_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "promotions" DROP CONSTRAINT "promotions_ended_by_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "promotions" DROP CONSTRAINT "promotions_started_by_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP CONSTRAINT "bookings_promotion_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "promotion_redemptions" DROP CONSTRAINT "UQ_promo_user_booking"`,
    );

    // 1. Re-point bookings from duplicate vehicles to the canonical vehicle (earliest vehicle_id / UUIDv7)
    await queryRunner.query(`
            WITH canonical_vehicles AS (
                SELECT 
                    owner_id, 
                    registration_number, 
                    MIN(vehicle_id::text)::uuid as canonical_id
                FROM vehicles
                GROUP BY owner_id, registration_number
            )
            UPDATE bookings b
            SET vehicle_id = c.canonical_id
            FROM vehicles v
            JOIN canonical_vehicles c ON c.owner_id = v.owner_id AND c.registration_number = v.registration_number
            WHERE b.vehicle_id = v.vehicle_id
              AND v.vehicle_id <> c.canonical_id
        `);

    // 2. Remove duplicate vehicle records, leaving exactly one (canonical) record per owner/registration
    await queryRunner.query(`
            DELETE FROM vehicles v
            WHERE v.vehicle_id NOT IN (
                SELECT MIN(v2.vehicle_id::text)::uuid
                FROM vehicles v2
                GROUP BY v2.owner_id, v2.registration_number
            )
        `);

    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD CONSTRAINT "UQ_90f34024cff3faac211b3011031" UNIQUE ("owner_id", "registration_number")`,
    );
    await queryRunner.query(
      `ALTER TABLE "promotion_redemptions" ADD CONSTRAINT "FK_39d64a2df33d0b8bc4341085416" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("promotion_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "promotion_redemptions" ADD CONSTRAINT "FK_a10799fabc1e279e09007941263" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "promotion_redemptions" ADD CONSTRAINT "FK_dccc0719a074504c80cddd0c7f3" FOREIGN KEY ("booking_id") REFERENCES "bookings"("booking_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "promotions" ADD CONSTRAINT "FK_29551a893cfe79cd63564608478" FOREIGN KEY ("started_by_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "promotions" ADD CONSTRAINT "FK_1a65fcfe434cdf87b51bbd074c4" FOREIGN KEY ("ended_by_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD CONSTRAINT "FK_46ae392cd3300686701e58bf585" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("promotion_id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "bookings" DROP CONSTRAINT "FK_46ae392cd3300686701e58bf585"`,
    );
    await queryRunner.query(
      `ALTER TABLE "promotions" DROP CONSTRAINT "FK_1a65fcfe434cdf87b51bbd074c4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "promotions" DROP CONSTRAINT "FK_29551a893cfe79cd63564608478"`,
    );
    await queryRunner.query(
      `ALTER TABLE "promotion_redemptions" DROP CONSTRAINT "FK_dccc0719a074504c80cddd0c7f3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "promotion_redemptions" DROP CONSTRAINT "FK_a10799fabc1e279e09007941263"`,
    );
    await queryRunner.query(
      `ALTER TABLE "promotion_redemptions" DROP CONSTRAINT "FK_39d64a2df33d0b8bc4341085416"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" DROP CONSTRAINT "UQ_90f34024cff3faac211b3011031"`,
    );
    await queryRunner.query(
      `ALTER TABLE "promotion_redemptions" ADD CONSTRAINT "UQ_promo_user_booking" UNIQUE ("promotion_id", "user_id", "booking_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "bookings" ADD CONSTRAINT "bookings_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("promotion_id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "promotions" ADD CONSTRAINT "promotions_started_by_id_fkey" FOREIGN KEY ("started_by_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "promotions" ADD CONSTRAINT "promotions_ended_by_id_fkey" FOREIGN KEY ("ended_by_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "promotion_redemptions" ADD CONSTRAINT "promotion_redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "promotion_redemptions" ADD CONSTRAINT "promotion_redemptions_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("promotion_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "promotion_redemptions" ADD CONSTRAINT "promotion_redemptions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("booking_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
