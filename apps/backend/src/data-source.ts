import { DataSource } from 'typeorm';
import { PluralNamingStrategy } from './strategies/plural-naming.strategy';
import { User } from './users/user.entity';
import { Admin } from './admins/entities/admin.entity';
import { Recruiter } from './recruiters/entities/recruiter.entity';
import { Applicant } from './applicants/entities/applicant.entity';
import { Application } from './applications/entities/application.entity';
import { Email } from './emails/entities/email.entity';
import { ScreeningRubric } from './rubrics/entities/screening-rubric.entity';
import { ScreeningCriteria } from './rubrics/entities/screening-criteria.entity';
import { InterviewRubric } from './rubrics/entities/interview-rubric.entity';
import { InterviewCriteria } from './rubrics/entities/interview-criteria.entity';
import { Assignment } from './applications/entities/assignment.entity';
import { ScreeningReview } from './applications/entities/screening-review.entity';
import { ScreeningReviewScore } from './applications/entities/screening-review-score.entity';
import { InterviewReview } from './applications/entities/interview-review.entity';
import { InterviewReviewScore } from './applications/entities/interview-review-score.entity';
import { InterviewReviewApproval } from './applications/entities/interview-review-approval.entity';
import { RawGoogleForm } from './raw-google-forms/entities/raw-google-form.entity';
import * as dotenv from 'dotenv';

dotenv.config({ path: 'apps/backend/.env' });

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.NX_DB_HOST,
  port: parseInt(process.env.NX_DB_PORT as string, 10),
  username: process.env.NX_DB_USERNAME,
  password: process.env.NX_DB_PASSWORD,
  database: process.env.NX_DB_DATABASE,
  entities: [
    User,
    Admin,
    Recruiter,
    Applicant,
    Application,
    Email,
    ScreeningRubric,
    ScreeningCriteria,
    InterviewRubric,
    InterviewCriteria,
    Assignment,
    ScreeningReview,
    ScreeningReviewScore,
    InterviewReview,
    InterviewReviewScore,
    InterviewReviewApproval,
    RawGoogleForm,
  ],
  migrations: ['apps/backend/src/migrations/*.ts'],
  // Setting synchronize: true shouldn't be used in production - otherwise you can lose production data
  synchronize: false,
  namingStrategy: new PluralNamingStrategy(),
});

export default AppDataSource;
