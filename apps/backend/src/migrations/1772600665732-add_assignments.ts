import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssignments1772600665732 implements MigrationInterface {
  name = 'AddAssignments1772600665732';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "assignments" ("id" SERIAL NOT NULL, "assignedAt" TIMESTAMP NOT NULL DEFAULT now(), "recruiter" integer, "application" integer, CONSTRAINT "UQ_8b3ec19e696e28330fb0a791893" UNIQUE ("recruiter", "application"), CONSTRAINT "PK_c54ca359535e0012b04dcbd80ee" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "assignments" ADD CONSTRAINT "FK_600234803c5dd187acdfcdd5fc9" FOREIGN KEY ("recruiter") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "assignments" ADD CONSTRAINT "FK_9e7a9e5b6e1e5ce773efff844c7" FOREIGN KEY ("application") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "assignments" DROP CONSTRAINT "FK_9e7a9e5b6e1e5ce773efff844c7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "assignments" DROP CONSTRAINT "FK_600234803c5dd187acdfcdd5fc9"`,
    );
    await queryRunner.query(`DROP TABLE "assignments"`);
  }
}
