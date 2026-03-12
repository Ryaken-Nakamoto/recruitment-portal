import 'reflect-metadata';
import AppDataSource from './data-source';
import { SeedService } from './seed/seed.service';
import { User } from './users/user.entity';
import { Admin } from './admins/entities/admin.entity';
import { Recruiter } from './recruiters/entities/recruiter.entity';
import { ScreeningRubric } from './rubrics/entities/screening-rubric.entity';
import { InterviewRubric } from './rubrics/entities/interview-rubric.entity';
import { Applicant } from './applicants/entities/applicant.entity';
import { Application } from './applications/entities/application.entity';
import { Email } from './emails/entities/email.entity';
import { RawGoogleForm } from './raw-google-forms/entities/raw-google-form.entity';
import { RawGoogleFormsService } from './raw-google-forms/raw-google-forms.service';
import { ApplicantsService } from './applicants/applicants.service';
import { ApplicationsService } from './applications/applications.service';

async function runSeed() {
  try {
    // Initialize database connection
    await AppDataSource.initialize();
    console.log('Database connected');

    // Create repositories
    const userRepo = AppDataSource.getRepository(User);
    const adminRepo = AppDataSource.getRepository(Admin);
    const recruiterRepo = AppDataSource.getRepository(Recruiter);
    const screeningRubricRepo = AppDataSource.getRepository(ScreeningRubric);
    const interviewRubricRepo = AppDataSource.getRepository(InterviewRubric);
    const applicantRepo = AppDataSource.getRepository(Applicant);
    const applicationRepo = AppDataSource.getRepository(Application);
    const emailRepo = AppDataSource.getRepository(Email);
    const rawGoogleFormRepo = AppDataSource.getRepository(RawGoogleForm);

    // Create dependent services
    const applicantsService = new ApplicantsService(applicantRepo);
    const applicationsService = new ApplicationsService(applicationRepo);
    const rawGoogleFormsService = new RawGoogleFormsService(
      rawGoogleFormRepo,
      null as unknown as never, // S3Service not needed for seeding
      applicantsService,
      applicationsService,
    );

    // Initialize seed service
    const seedService = new SeedService(
      userRepo,
      adminRepo,
      recruiterRepo,
      screeningRubricRepo,
      interviewRubricRepo,
      applicantRepo,
      applicationRepo,
      emailRepo,
      rawGoogleFormsService,
    );

    // Run seed
    await seedService.onApplicationBootstrap();
    console.log('Seed completed successfully');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

runSeed();
