import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRoundToAssignment1773636202736 implements MigrationInterface {
  name = 'AddRoundToAssignment1773636202736';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "assignments" DROP CONSTRAINT "UQ_8b3ec19e696e28330fb0a791893"`,
    );
    await queryRunner.query(
      `ALTER TABLE "assignments" ADD "round" character varying NOT NULL DEFAULT 'screening'`,
    );
    await queryRunner.query(
      `ALTER TABLE "assignments" ADD CONSTRAINT "UQ_819a51961810301c2e245380e27" UNIQUE ("recruiter", "application", "round")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "assignments" DROP CONSTRAINT "UQ_819a51961810301c2e245380e27"`,
    );
    await queryRunner.query(`ALTER TABLE "assignments" DROP COLUMN "round"`);
    await queryRunner.query(
      `ALTER TABLE "assignments" ADD CONSTRAINT "UQ_8b3ec19e696e28330fb0a791893" UNIQUE ("recruiter", "application")`,
    );
  }
}
