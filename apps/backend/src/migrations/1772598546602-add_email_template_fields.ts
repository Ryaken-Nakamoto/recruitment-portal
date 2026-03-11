import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailTemplateFields1772598546602 implements MigrationInterface {
  name = 'AddEmailTemplateFields1772598546602';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "emails" ADD "requiredVariables" text array NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "emails" ADD "defaultContext" jsonb NOT NULL DEFAULT '{}'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "emails" DROP COLUMN "defaultContext"`,
    );
    await queryRunner.query(
      `ALTER TABLE "emails" DROP COLUMN "requiredVariables"`,
    );
  }
}
