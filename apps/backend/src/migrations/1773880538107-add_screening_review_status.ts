import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddScreeningReviewStatus1773880538107
  implements MigrationInterface
{
  name = 'AddScreeningReviewStatus1773880538107';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "screeningreviews" ADD "status" character varying NOT NULL DEFAULT 'draft'`,
    );
    // Backfill: all existing rows were submitted before the draft concept existed
    await queryRunner.query(
      `UPDATE "screeningreviews" SET "status" = 'submitted'`,
    );
    await queryRunner.query(
      `ALTER TABLE "screeningreviews" ALTER COLUMN "submittedAt" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "screeningreviews" ALTER COLUMN "submittedAt" DROP DEFAULT`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "screeningreviews" ALTER COLUMN "submittedAt" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "screeningreviews" ALTER COLUMN "submittedAt" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "screeningreviews" DROP COLUMN "status"`,
    );
  }
}
