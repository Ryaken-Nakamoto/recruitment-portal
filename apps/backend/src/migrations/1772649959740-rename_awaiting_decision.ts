import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameAwaitingDecision1772649959740 implements MigrationInterface {
  name = 'RenameAwaitingDecision1772649959740';

  public async up(queryRunner: QueryRunner): Promise<void> {
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
      `ALTER TABLE "screeningcriterias" DROP COLUMN "score"`,
    );
    await queryRunner.query(
      `ALTER TABLE "interviewcriterias" DROP COLUMN "score"`,
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
      `ALTER TABLE "interviewcriterias" ADD "score" double precision`,
    );
    await queryRunner.query(
      `ALTER TABLE "screeningcriterias" ADD "score" double precision`,
    );
    await queryRunner.query(`DROP TABLE "interviewreviews"`);
    await queryRunner.query(`DROP TABLE "interviewreviewapprovals"`);
    await queryRunner.query(`DROP TABLE "interviewreviewscores"`);
    await queryRunner.query(`DROP TABLE "screeningreviews"`);
    await queryRunner.query(`DROP TABLE "screeningreviewscores"`);
  }
}
