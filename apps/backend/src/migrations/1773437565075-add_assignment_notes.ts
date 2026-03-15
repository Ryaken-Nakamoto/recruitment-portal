import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssignmentNotes1773437565075 implements MigrationInterface {
  name = 'AddAssignmentNotes1773437565075';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "assignments" ADD "notes" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "assignments" DROP COLUMN "notes"`);
  }
}
