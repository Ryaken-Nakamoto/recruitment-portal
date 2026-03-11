import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { User } from '../users/user.entity';
import { Admin } from '../admins/entities/admin.entity';
import { ScreeningRubric } from '../rubrics/entities/screening-rubric.entity';
import { InterviewRubric } from '../rubrics/entities/interview-rubric.entity';
import { Applicant } from '../applicants/entities/applicant.entity';
import { Application } from '../applications/entities/application.entity';
import { Email } from '../emails/entities/email.entity';
// ─── DEV ONLY ─ remove before shipping ───────────────────────────────────────
import { Recruiter } from '../recruiters/entities/recruiter.entity';
// ─────────────────────────────────────────────────────────────────────────────

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Admin,
      ScreeningRubric,
      InterviewRubric,
      Applicant,
      Application,
      Email,
      // ─── DEV ONLY ─ remove before shipping ─────────────────────────────────────
      Recruiter,
      // ─────────────────────────────────────────────────────────────────────────────
    ]),
  ],
  providers: [SeedService],
})
export class SeedModule {}
