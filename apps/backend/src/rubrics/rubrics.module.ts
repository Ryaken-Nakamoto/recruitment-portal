import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScreeningRubric } from './entities/screening-rubric.entity';
import { ScreeningCriteria } from './entities/screening-criteria.entity';
import { InterviewRubric } from './entities/interview-rubric.entity';
import { InterviewCriteria } from './entities/interview-criteria.entity';
import { RubricsService } from './rubrics.service';
import { RubricsController } from './rubrics.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ScreeningRubric,
      ScreeningCriteria,
      InterviewRubric,
      InterviewCriteria,
    ]),
  ],
  controllers: [RubricsController],
  providers: [RubricsService],
  exports: [TypeOrmModule],
})
export class RubricsModule {}
