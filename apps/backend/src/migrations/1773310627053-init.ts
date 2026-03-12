import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1773310627053 implements MigrationInterface {
  name = 'Init1773310627053';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "users" ("id" SERIAL NOT NULL, "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "email" character varying NOT NULL, "role" character varying NOT NULL, "accountStatus" character varying NOT NULL, "createdDate" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ace513fa30d485cfd25c11a9e4" ON "users" ("role") `,
    );
    await queryRunner.query(
      `CREATE TABLE "rawgoogleforms" ("id" SERIAL NOT NULL, "email" character varying NOT NULL, "fullName" character varying NOT NULL, "year" character varying NOT NULL, "college" character varying NOT NULL, "major" character varying NOT NULL, "codingExperience" text array NOT NULL DEFAULT '{}', "codingExperienceOther" character varying, "resumeUrl" character varying NOT NULL, "whyC4C" text NOT NULL, "selfStartedProject" text, "communityImpact" text, "teamConflict" text, "otherExperiences" text, "heardAboutC4C" text array NOT NULL DEFAULT '{}', "heardAboutC4COther" character varying, "appliedBefore" character varying NOT NULL, "fallCommitments" text NOT NULL, "questionsOrConcerns" text, "submittedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_9baef40fab5edcea8c760fec1e6" UNIQUE ("email"), CONSTRAINT "PK_15c1360f7e9940054e2ace84b2f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "applications" ("id" SERIAL NOT NULL, "round" character varying NOT NULL DEFAULT 'screening', "roundStatus" character varying NOT NULL DEFAULT 'pending', "finalDecision" character varying, "submittedAt" TIMESTAMP NOT NULL DEFAULT now(), "applicant" integer, "rawGoogleForm" integer, CONSTRAINT "REL_75ebb1dbe86832f658612806df" UNIQUE ("applicant"), CONSTRAINT "REL_a0a15a3527a85210f77cdb04d2" UNIQUE ("rawGoogleForm"), CONSTRAINT "PK_938c0a27255637bde919591888f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "applicants" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "email" character varying NOT NULL, "academicYear" character varying NOT NULL, "major" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_cf1d183c497a68c4f07fe62d808" UNIQUE ("email"), CONSTRAINT "PK_c02ec3c46124479ce758ca50943" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "emails" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "subject" character varying NOT NULL, "body" text NOT NULL, "applicationStage" character varying NOT NULL, "decision" character varying NOT NULL, "requiredVariables" text array NOT NULL DEFAULT '{}', "defaultContext" jsonb NOT NULL DEFAULT '{}', CONSTRAINT "UQ_157f66a6a80c5a0e3fdba36262b" UNIQUE ("name"), CONSTRAINT "PK_a54dcebef8d05dca7e839749571" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "screeningcriterias" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "oneDescription" text NOT NULL, "twoDescription" text NOT NULL, "threeDescription" text NOT NULL, "rubric" integer NOT NULL, CONSTRAINT "PK_6583895b903dfdf2298556e4ae4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "screeningrubrics" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, CONSTRAINT "PK_9ad196190dd45daa45fd4e8ad84" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "interviewcriterias" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "question" text NOT NULL, "criteria" text NOT NULL, "maxScore" integer NOT NULL, "rubric" integer NOT NULL, CONSTRAINT "PK_5eb0977ccc6cdd9f15a4e98e426" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "interviewrubrics" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, CONSTRAINT "PK_a7c263d5e7d4af4ebd0b6c14af1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "assignments" ("id" SERIAL NOT NULL, "assignedAt" TIMESTAMP NOT NULL DEFAULT now(), "recruiter" integer, "application" integer, CONSTRAINT "UQ_8b3ec19e696e28330fb0a791893" UNIQUE ("recruiter", "application"), CONSTRAINT "PK_c54ca359535e0012b04dcbd80ee" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "screeningreviewscores" ("id" SERIAL NOT NULL, "score" double precision NOT NULL, "review" integer, "criteria" integer, CONSTRAINT "UQ_ccabdafdaa7d21b6383d73333fc" UNIQUE ("review", "criteria"), CONSTRAINT "PK_84cafb621bef6c0a8d38aceb649" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "screeningreviews" ("id" SERIAL NOT NULL, "submittedAt" TIMESTAMP NOT NULL DEFAULT now(), "assignment" integer, CONSTRAINT "REL_b0a5e96306fccd0b8f411d619c" UNIQUE ("assignment"), CONSTRAINT "PK_c08b998e4483aac32d89acf1519" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "interviewreviewscores" ("id" SERIAL NOT NULL, "score" double precision NOT NULL, "review" integer, "criteria" integer, CONSTRAINT "UQ_1d034e26f4f108e340c08e1bf7e" UNIQUE ("review", "criteria"), CONSTRAINT "PK_4c0668e1582584d011112a4775a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "interviewreviewapprovals" ("id" SERIAL NOT NULL, "approved" boolean, "decidedAt" TIMESTAMP, "review" integer, "assignment" integer, CONSTRAINT "UQ_8cbd033780a5676aad44052f57f" UNIQUE ("review", "assignment"), CONSTRAINT "PK_ccca55b50366551f43ef5316d63" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "interviewreviews" ("id" SERIAL NOT NULL, "round" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'draft', "submittedAt" TIMESTAMP, "application" integer, "submittedBy" integer, CONSTRAINT "UQ_5b9334ffe8b6ccfb3a9a29528ab" UNIQUE ("application", "round"), CONSTRAINT "PK_41b7bd24cb1b544c6c0a735facb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "applications" ADD CONSTRAINT "FK_75ebb1dbe86832f658612806df0" FOREIGN KEY ("applicant") REFERENCES "applicants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "applications" ADD CONSTRAINT "FK_a0a15a3527a85210f77cdb04d2f" FOREIGN KEY ("rawGoogleForm") REFERENCES "rawgoogleforms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "screeningcriterias" ADD CONSTRAINT "FK_96f0d30ec7bc599dc2da928d5b8" FOREIGN KEY ("rubric") REFERENCES "screeningrubrics"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "interviewcriterias" ADD CONSTRAINT "FK_f933821f5dafb6ecc698d1d5f1a" FOREIGN KEY ("rubric") REFERENCES "interviewrubrics"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "assignments" ADD CONSTRAINT "FK_600234803c5dd187acdfcdd5fc9" FOREIGN KEY ("recruiter") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "assignments" ADD CONSTRAINT "FK_9e7a9e5b6e1e5ce773efff844c7" FOREIGN KEY ("application") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "screeningreviewscores" ADD CONSTRAINT "FK_81508a92b0fdcfd7b86d71c584b" FOREIGN KEY ("review") REFERENCES "screeningreviews"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "screeningreviewscores" ADD CONSTRAINT "FK_3ef55391ace4b9c4abf409b5b91" FOREIGN KEY ("criteria") REFERENCES "screeningcriterias"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "screeningreviews" ADD CONSTRAINT "FK_b0a5e96306fccd0b8f411d619c9" FOREIGN KEY ("assignment") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "interviewreviewscores" ADD CONSTRAINT "FK_7495fcec0a9eb38b6cda808f631" FOREIGN KEY ("review") REFERENCES "interviewreviews"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "interviewreviewscores" ADD CONSTRAINT "FK_b033a69b0b0f5ee5b2098c5c172" FOREIGN KEY ("criteria") REFERENCES "interviewcriterias"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "interviewreviewapprovals" ADD CONSTRAINT "FK_b1ccf405b1edb49fee164df8de8" FOREIGN KEY ("review") REFERENCES "interviewreviews"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "interviewreviewapprovals" ADD CONSTRAINT "FK_98cc1167558ecbadcf1eef1616f" FOREIGN KEY ("assignment") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "interviewreviews" ADD CONSTRAINT "FK_276643195b05a8d9c362529dd6b" FOREIGN KEY ("application") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "interviewreviews" ADD CONSTRAINT "FK_eec8678787215f3625a3ee56931" FOREIGN KEY ("submittedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "interviewreviews" DROP CONSTRAINT "FK_eec8678787215f3625a3ee56931"`,
    );
    await queryRunner.query(
      `ALTER TABLE "interviewreviews" DROP CONSTRAINT "FK_276643195b05a8d9c362529dd6b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "interviewreviewapprovals" DROP CONSTRAINT "FK_98cc1167558ecbadcf1eef1616f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "interviewreviewapprovals" DROP CONSTRAINT "FK_b1ccf405b1edb49fee164df8de8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "interviewreviewscores" DROP CONSTRAINT "FK_b033a69b0b0f5ee5b2098c5c172"`,
    );
    await queryRunner.query(
      `ALTER TABLE "interviewreviewscores" DROP CONSTRAINT "FK_7495fcec0a9eb38b6cda808f631"`,
    );
    await queryRunner.query(
      `ALTER TABLE "screeningreviews" DROP CONSTRAINT "FK_b0a5e96306fccd0b8f411d619c9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "screeningreviewscores" DROP CONSTRAINT "FK_3ef55391ace4b9c4abf409b5b91"`,
    );
    await queryRunner.query(
      `ALTER TABLE "screeningreviewscores" DROP CONSTRAINT "FK_81508a92b0fdcfd7b86d71c584b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "assignments" DROP CONSTRAINT "FK_9e7a9e5b6e1e5ce773efff844c7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "assignments" DROP CONSTRAINT "FK_600234803c5dd187acdfcdd5fc9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "interviewcriterias" DROP CONSTRAINT "FK_f933821f5dafb6ecc698d1d5f1a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "screeningcriterias" DROP CONSTRAINT "FK_96f0d30ec7bc599dc2da928d5b8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "applications" DROP CONSTRAINT "FK_a0a15a3527a85210f77cdb04d2f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "applications" DROP CONSTRAINT "FK_75ebb1dbe86832f658612806df0"`,
    );
    await queryRunner.query(`DROP TABLE "interviewreviews"`);
    await queryRunner.query(`DROP TABLE "interviewreviewapprovals"`);
    await queryRunner.query(`DROP TABLE "interviewreviewscores"`);
    await queryRunner.query(`DROP TABLE "screeningreviews"`);
    await queryRunner.query(`DROP TABLE "screeningreviewscores"`);
    await queryRunner.query(`DROP TABLE "assignments"`);
    await queryRunner.query(`DROP TABLE "interviewrubrics"`);
    await queryRunner.query(`DROP TABLE "interviewcriterias"`);
    await queryRunner.query(`DROP TABLE "screeningrubrics"`);
    await queryRunner.query(`DROP TABLE "screeningcriterias"`);
    await queryRunner.query(`DROP TABLE "emails"`);
    await queryRunner.query(`DROP TABLE "applicants"`);
    await queryRunner.query(`DROP TABLE "applications"`);
    await queryRunner.query(`DROP TABLE "rawgoogleforms"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ace513fa30d485cfd25c11a9e4"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
