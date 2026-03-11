import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminsService } from './admins.service';
import { AdminsController } from './admins.controller';
import { Admin } from './entities/admin.entity';
import { AdminRecruitersController } from './admin-recruiters.controller';
import { AdminRecruitersService } from './admin-recruiters.service';
import { AdminAssignmentsController } from './admin-assignments.controller';
import { AdminAssignmentsService } from './admin-assignments.service';
import { AdminDecisionsController } from './admin-decisions.controller';
import { AdminDecisionsService } from './admin-decisions.service';
import { Recruiter } from '../recruiters/entities/recruiter.entity';
import { User } from '../users/user.entity';
import { Application } from '../applications/entities/application.entity';
import { Assignment } from '../applications/entities/assignment.entity';
import { ScreeningReview } from '../applications/entities/screening-review.entity';
import { InterviewReview } from '../applications/entities/interview-review.entity';
import { Email } from '../emails/entities/email.entity';
import { UtilModule } from '../util/util.module';
import { ScreeningReviewScore } from '../applications/entities/screening-review-score.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Admin,
      Recruiter,
      User,
      Application,
      Assignment,
      ScreeningReview,
      ScreeningReviewScore,
      InterviewReview,
      Email,
    ]),
    UtilModule,
  ],
  controllers: [
    AdminsController,
    AdminRecruitersController,
    AdminAssignmentsController,
    AdminDecisionsController,
  ],
  providers: [
    AdminsService,
    AdminRecruitersService,
    AdminAssignmentsService,
    AdminDecisionsService,
  ],
})
export class AdminsModule {}
