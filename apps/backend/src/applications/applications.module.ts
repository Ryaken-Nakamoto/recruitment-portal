import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';
import { Application } from './entities/application.entity';
import { Assignment } from './entities/assignment.entity';
import { ScreeningReview } from './entities/screening-review.entity';
import { UtilModule } from '../util/util.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Application, Assignment, ScreeningReview]),
    UtilModule,
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
