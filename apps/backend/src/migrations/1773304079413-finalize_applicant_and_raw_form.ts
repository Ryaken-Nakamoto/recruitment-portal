import { MigrationInterface, QueryRunner } from 'typeorm';

export class FinalizeApplicantAndRawForm1773304079413
  implements MigrationInterface
{
  name = 'FinalizeApplicantAndRawForm1773304079413';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "applicants" DROP COLUMN "graduationYear"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rawgoogleforms" DROP COLUMN "appliedBefore"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rawgoogleforms" ADD "appliedBefore" character varying NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "rawgoogleforms" DROP COLUMN "appliedBefore"`,
    );
    await queryRunner.query(
      `ALTER TABLE "rawgoogleforms" ADD "appliedBefore" boolean NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "applicants" ADD "graduationYear" integer`,
    );
  }
}
