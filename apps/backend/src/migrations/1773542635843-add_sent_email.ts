import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSentEmail1773542635843 implements MigrationInterface {
  name = 'AddSentEmail1773542635843';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "sentemails" ("id" SERIAL NOT NULL, "applicationId" integer NOT NULL, "toEmail" character varying NOT NULL, "fromEmail" character varying NOT NULL, "subject" character varying NOT NULL, "body" text NOT NULL, "applicationStage" character varying NOT NULL, "finalDecision" character varying, "sentAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_24bf19a7fcb76cde8569d00083b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "sentemails" ADD CONSTRAINT "FK_f6105ff99ab4d8ad185b75f742d" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sentemails" DROP CONSTRAINT "FK_f6105ff99ab4d8ad185b75f742d"`,
    );
    await queryRunner.query(`DROP TABLE "sentemails"`);
  }
}
