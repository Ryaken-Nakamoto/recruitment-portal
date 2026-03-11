import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRubrics1772596438237 implements MigrationInterface {
  name = 'AddRubrics1772596438237';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "applications" ("id" SERIAL NOT NULL, "answers" jsonb NOT NULL, "round" character varying NOT NULL, "roundStatus" character varying NOT NULL, "finalDecision" character varying, "submittedAt" TIMESTAMP NOT NULL DEFAULT now(), "applicant" integer, CONSTRAINT "REL_75ebb1dbe86832f658612806df" UNIQUE ("applicant"), CONSTRAINT "PK_938c0a27255637bde919591888f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "applicants" ("id" SERIAL NOT NULL, "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "email" character varying NOT NULL, "graduationYear" integer NOT NULL, "academicYear" character varying NOT NULL, "major" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_cf1d183c497a68c4f07fe62d808" UNIQUE ("email"), CONSTRAINT "PK_c02ec3c46124479ce758ca50943" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "screeningcriterias" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "oneDescription" text NOT NULL, "twoDescription" text NOT NULL, "threeDescription" text NOT NULL, "score" double precision, "rubric" integer NOT NULL, CONSTRAINT "PK_6583895b903dfdf2298556e4ae4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "screeningrubrics" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, CONSTRAINT "PK_9ad196190dd45daa45fd4e8ad84" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "interviewcriterias" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "question" text NOT NULL, "criteria" text NOT NULL, "maxScore" integer NOT NULL, "score" double precision, "rubric" integer NOT NULL, CONSTRAINT "PK_5eb0977ccc6cdd9f15a4e98e426" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "interviewrubrics" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, CONSTRAINT "PK_a7c263d5e7d4af4ebd0b6c14af1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "applications" ADD CONSTRAINT "FK_75ebb1dbe86832f658612806df0" FOREIGN KEY ("applicant") REFERENCES "applicants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "screeningcriterias" ADD CONSTRAINT "FK_96f0d30ec7bc599dc2da928d5b8" FOREIGN KEY ("rubric") REFERENCES "screeningrubrics"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "interviewcriterias" ADD CONSTRAINT "FK_f933821f5dafb6ecc698d1d5f1a" FOREIGN KEY ("rubric") REFERENCES "interviewrubrics"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "interviewcriterias" DROP CONSTRAINT "FK_f933821f5dafb6ecc698d1d5f1a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "screeningcriterias" DROP CONSTRAINT "FK_96f0d30ec7bc599dc2da928d5b8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "applications" DROP CONSTRAINT "FK_75ebb1dbe86832f658612806df0"`,
    );
    await queryRunner.query(`DROP TABLE "interviewrubrics"`);
    await queryRunner.query(`DROP TABLE "interviewcriterias"`);
    await queryRunner.query(`DROP TABLE "screeningrubrics"`);
    await queryRunner.query(`DROP TABLE "screeningcriterias"`);
    await queryRunner.query(`DROP TABLE "applicants"`);
    await queryRunner.query(`DROP TABLE "applications"`);
  }
}
