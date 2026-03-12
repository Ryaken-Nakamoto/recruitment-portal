import { MigrationInterface, QueryRunner } from 'typeorm';

export class ApplicantNameAndRawFormRelation1773272182011
  implements MigrationInterface
{
  name = 'ApplicantNameAndRawFormRelation1773272182011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "applications" RENAME COLUMN "answers" TO "rawGoogleForm"`,
    );
    // Add name column as nullable first
    await queryRunner.query(
      `ALTER TABLE "applicants" ADD "name" character varying`,
    );
    // Populate name from firstName and lastName
    await queryRunner.query(
      `UPDATE "applicants" SET "name" = CONCAT(COALESCE("firstName", ''), ' ', COALESCE("lastName", '')) WHERE "name" IS NULL`,
    );
    // Make name NOT NULL
    await queryRunner.query(
      `ALTER TABLE "applicants" ALTER COLUMN "name" SET NOT NULL`,
    );
    // Drop old columns
    await queryRunner.query(`ALTER TABLE "applicants" DROP COLUMN "firstName"`);
    await queryRunner.query(`ALTER TABLE "applicants" DROP COLUMN "lastName"`);
    // Convert answers JSONB to rawGoogleForm FK
    await queryRunner.query(
      `ALTER TABLE "applications" DROP COLUMN "rawGoogleForm"`,
    );
    await queryRunner.query(
      `ALTER TABLE "applications" ADD "rawGoogleForm" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "applications" ADD CONSTRAINT "UQ_a0a15a3527a85210f77cdb04d2f" UNIQUE ("rawGoogleForm")`,
    );
    // Make graduationYear nullable
    await queryRunner.query(
      `ALTER TABLE "applicants" ALTER COLUMN "graduationYear" DROP NOT NULL`,
    );
    // Add FK constraint
    await queryRunner.query(
      `ALTER TABLE "applications" ADD CONSTRAINT "FK_a0a15a3527a85210f77cdb04d2f" FOREIGN KEY ("rawGoogleForm") REFERENCES "rawgoogleforms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "applications" DROP CONSTRAINT "FK_a0a15a3527a85210f77cdb04d2f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "applicants" ALTER COLUMN "graduationYear" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "applications" DROP CONSTRAINT "UQ_a0a15a3527a85210f77cdb04d2f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "applications" DROP COLUMN "rawGoogleForm"`,
    );
    await queryRunner.query(
      `ALTER TABLE "applications" ADD "rawGoogleForm" jsonb NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "applicants" DROP COLUMN "name"`);
    await queryRunner.query(
      `ALTER TABLE "applicants" ADD "lastName" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "applicants" ADD "firstName" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "applications" RENAME COLUMN "rawGoogleForm" TO "answers"`,
    );
  }
}
