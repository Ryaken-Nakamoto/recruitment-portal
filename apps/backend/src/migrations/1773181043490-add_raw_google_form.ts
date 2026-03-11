import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRawGoogleForm1773181043490 implements MigrationInterface {
  name = 'AddRawGoogleForm1773181043490';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "rawgoogleforms" ("id" SERIAL NOT NULL, "email" character varying NOT NULL, "fullName" character varying NOT NULL, "year" character varying NOT NULL, "college" character varying NOT NULL, "major" character varying NOT NULL, "codingExperience" text array NOT NULL DEFAULT '{}', "codingExperienceOther" character varying, "resumeUrl" character varying NOT NULL, "whyC4C" text NOT NULL, "selfStartedProject" text, "communityImpact" text, "teamConflict" text, "otherExperiences" text, "heardAboutC4C" text array NOT NULL DEFAULT '{}', "heardAboutC4COther" character varying, "appliedBefore" boolean NOT NULL, "fallCommitments" text NOT NULL, "questionsOrConcerns" text, "submittedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_15c1360f7e9940054e2ace84b2f" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "rawgoogleforms"`);
  }
}
