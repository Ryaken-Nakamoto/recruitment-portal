import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueConstraintToRawGoogleFormEmail1773264066111
  implements MigrationInterface
{
  name = 'AddUniqueConstraintToRawGoogleFormEmail1773264066111';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "rawgoogleforms" ADD CONSTRAINT "UQ_9baef40fab5edcea8c760fec1e6" UNIQUE ("email")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "rawgoogleforms" DROP CONSTRAINT "UQ_9baef40fab5edcea8c760fec1e6"`,
    );
  }
}
