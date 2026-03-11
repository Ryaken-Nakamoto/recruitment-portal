import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmail1772597119765 implements MigrationInterface {
  name = 'AddEmail1772597119765';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "emails" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "subject" character varying NOT NULL, "body" text NOT NULL, "applicationStage" character varying NOT NULL, "decision" character varying NOT NULL, CONSTRAINT "UQ_157f66a6a80c5a0e3fdba36262b" UNIQUE ("name"), CONSTRAINT "PK_a54dcebef8d05dca7e839749571" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "emails"`);
  }
}
