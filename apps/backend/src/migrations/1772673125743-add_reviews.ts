import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReviews1772673125743 implements MigrationInterface {
  name = 'AddReviews1772673125743';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "applications" ALTER COLUMN "round" SET DEFAULT 'screening'`,
    );
    await queryRunner.query(
      `ALTER TABLE "applications" ALTER COLUMN "roundStatus" SET DEFAULT 'pending'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "applications" ALTER COLUMN "roundStatus" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "applications" ALTER COLUMN "round" DROP DEFAULT`,
    );
  }
}
