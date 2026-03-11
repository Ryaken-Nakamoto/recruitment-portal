import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RecruitersService } from './recruiters.service';
import { RecruitersController } from './recruiters.controller';
import { RecruitersReviewService } from './recruiters-review.service';
import { RecruitersReviewController } from './recruiters-review.controller';
import { Recruiter } from './entities/recruiter.entity';
import { Assignment } from '../applications/entities/assignment.entity';
import { Application } from '../applications/entities/application.entity';
import { ScreeningReview } from '../applications/entities/screening-review.entity';
import { ScreeningReviewScore } from '../applications/entities/screening-review-score.entity';
import { InterviewReview } from '../applications/entities/interview-review.entity';
import { InterviewReviewScore } from '../applications/entities/interview-review-score.entity';
import { InterviewReviewApproval } from '../applications/entities/interview-review-approval.entity';
import { ScreeningCriteria } from '../rubrics/entities/screening-criteria.entity';
import { InterviewCriteria } from '../rubrics/entities/interview-criteria.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Recruiter,
      Assignment,
      Application,
      ScreeningReview,
      ScreeningReviewScore,
      InterviewReview,
      InterviewReviewScore,
      InterviewReviewApproval,
      ScreeningCriteria,
      InterviewCriteria,
    ]),
  ],
  controllers: [RecruitersController, RecruitersReviewController],
  providers: [RecruitersService, RecruitersReviewService],
})
export class RecruitersModule {}
