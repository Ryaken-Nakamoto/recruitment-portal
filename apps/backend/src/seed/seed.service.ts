import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import {
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
  UsernameExistsException,
} from '@aws-sdk/client-cognito-identity-provider';
import { User } from '../users/user.entity';
import { Admin } from '../admins/entities/admin.entity';
// ─── DEV ONLY ─ remove before shipping ───────────────────────────────────────
import { Recruiter } from '../recruiters/entities/recruiter.entity';
// ─────────────────────────────────────────────────────────────────────────────
import CognitoAuthConfig from '../auth/aws-exports';
import { Role } from '../users/role';
import { AccountStatus } from '../users/status';
import { ScreeningRubric } from '../rubrics/entities/screening-rubric.entity';
import { InterviewRubric } from '../rubrics/entities/interview-rubric.entity';
import { Applicant } from '../applicants/entities/applicant.entity';
import { Application } from '../applications/entities/application.entity';
import { ApplicationRound } from '../applications/enums/application-round.enum';
import { Email } from '../emails/entities/email.entity';
import { FinalDecision } from '../applications/enums/final-decision.enum';
import { RawGoogleFormsService } from '../raw-google-forms/raw-google-forms.service';
import { SubmitGoogleFormDto } from '../raw-google-forms/dto/submit-google-form.dto';
import { FormYear } from '../raw-google-forms/enums/form-year.enum';
import { College } from '../raw-google-forms/enums/college.enum';
import { CodingExperience } from '../raw-google-forms/enums/coding-experience.enum';
import { HearAboutC4C } from '../raw-google-forms/enums/hear-about-c4c.enum';

// ─── DEV ONLY ─ remove before shipping ───────────────────────────────────────
const MOCK_RECRUITERS: Array<{
  firstName: string;
  lastName: string;
  email: string;
}> = [
  {
    firstName: 'Alice',
    lastName: 'Park',
    email: 'alice.park@c4c.test',
  },
  {
    firstName: 'Ben',
    lastName: 'Torres',
    email: 'ben.torres@c4c.test',
  },
  {
    firstName: 'Claire',
    lastName: 'Novak',
    email: 'claire.novak@c4c.test',
  },
  {
    firstName: 'David',
    lastName: 'Singh',
    email: 'david.singh@c4c.test',
  },
  { firstName: 'Emma', lastName: 'Osei', email: 'emma.osei@c4c.test' },
  {
    firstName: 'Felix',
    lastName: 'Yamamoto',
    email: 'felix.yamamoto@c4c.test',
  },
  {
    firstName: 'Grace',
    lastName: 'Murphy',
    email: 'grace.murphy@c4c.test',
  },
  {
    firstName: 'Henry',
    lastName: 'Kowalski',
    email: 'henry.kowalski@c4c.test',
  },
  {
    firstName: 'Isla',
    lastName: 'Santos',
    email: 'isla.santos@c4c.test',
  },
  {
    firstName: 'James',
    lastName: 'Okonkwo',
    email: 'james.okonkwo@c4c.test',
  },
];
// ─────────────────────────────────────────────────────────────────────────────

function getMockResumeUrl(): string {
  const bucket =
    process.env.AWS_RESUMES_BUCKET ||
    'recruitment-portal-resumes-12324123t51234';
  const region = process.env.REGION || 'us-east-1';
  const key =
    process.env.SEED_MOCK_RESUME_KEY ||
    'resumes/04f73eb0-c49d-4cb6-818c-7eb39538bfb4-Ryaken_Nakamoto_AI_Resume - Ryaken Nakamoto.pdf';
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

const FIRST_NAMES = [
  'Alex',
  'Jordan',
  'Morgan',
  'Riley',
  'Casey',
  'Sam',
  'Taylor',
  'Drew',
  'Jamie',
  'Quinn',
  'Casey',
  'Morgan',
  'Riley',
  'Taylor',
  'Jordan',
  'Alex',
  'Sam',
  'Jamie',
  'Drew',
  'Quinn',
  'Morgan',
  'Taylor',
  'Alex',
  'Casey',
  'Jordan',
  'Riley',
  'Sam',
  'Drew',
  'Quinn',
  'Jamie',
  'Alex',
  'Jordan',
  'Morgan',
  'Riley',
  'Casey',
  'Sam',
  'Taylor',
  'Drew',
  'Jamie',
  'Quinn',
  'Casey',
  'Morgan',
  'Riley',
  'Taylor',
  'Jordan',
  'Alex',
  'Sam',
  'Jamie',
  'Drew',
  'Quinn',
];

const LAST_NAMES = [
  'Chen',
  'Patel',
  'Liu',
  'Thompson',
  'Nguyen',
  'Rodriguez',
  'Kim',
  'Okafor',
  'Walsh',
  'Hernandez',
  'Anderson',
  'Martinez',
  'Taylor',
  'Brown',
  'Jones',
  'Garcia',
  'Miller',
  'Davis',
  'Wilson',
  'Moore',
  'Jackson',
  'White',
  'Harris',
  'Martin',
  'Lee',
  'Perez',
  'Thompson',
  'Clark',
  'Lewis',
  'Walker',
  'Hall',
  'Young',
  'Gonzalez',
  'Hernandez',
  'Lopez',
  'Gonzales',
  'Carter',
  'Mitchell',
  'Roberts',
  'Phillips',
  'Evans',
  'Turner',
  'Diaz',
  'Parker',
  'Edwards',
  'Collins',
  'Reyes',
  'Stewart',
  'Morris',
  'Murphy',
];

const COLLEGES = [College.KHOURY, College.ENGINEERING, College.CSSH];

const MAJORS = [
  'Computer Science',
  'Software Engineering',
  'Data Science',
  'Information Systems',
  'Computer Engineering',
  'Cognitive Science',
  'Mathematics & CS',
];

const CODING_EXPERIENCE_OPTIONS = [
  [CodingExperience.FUNDIES_1],
  [CodingExperience.FUNDIES_1, CodingExperience.FUNDIES_2],
  [
    CodingExperience.FUNDIES_1,
    CodingExperience.FUNDIES_2,
    CodingExperience.OOD,
  ],
  [
    CodingExperience.FUNDIES_1,
    CodingExperience.FUNDIES_2,
    CodingExperience.OOD,
    CodingExperience.DATABASES,
  ],
  [CodingExperience.WEB_DEVELOPMENT, CodingExperience.DATABASES],
  [
    CodingExperience.FUNDIES_1,
    CodingExperience.FUNDIES_2,
    CodingExperience.OOD,
    CodingExperience.SOFTWARE_ENGINEERING,
  ],
];

const YEARS = [
  FormYear.FIRST,
  FormYear.SECOND,
  FormYear.THIRD,
  FormYear.FOURTH,
];

function generateMockApplications(): SubmitGoogleFormDto[] {
  const applications: SubmitGoogleFormDto[] = [];

  for (let i = 0; i < 50; i++) {
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = LAST_NAMES[i % LAST_NAMES.length];
    const email = `applicant.${i + 1}@c4c.test`;
    const college = COLLEGES[i % COLLEGES.length];
    const major = MAJORS[i % MAJORS.length];
    const codingExperience =
      CODING_EXPERIENCE_OPTIONS[i % CODING_EXPERIENCE_OPTIONS.length];
    const year = YEARS[i % YEARS.length];

    applications.push({
      email,
      fullName: `${firstName} ${lastName}`,
      year,
      college,
      major,
      codingExperience,
      resumeUrl: getMockResumeUrl(),
      whyC4C: `I am passionate about using technology for social good. I believe C4C's mission aligns with my values and I want to contribute meaningful work. (Applicant ${
        i + 1
      })`,
      selfStartedProject:
        i % 3 === 0 ? `Built a project for applicant ${i + 1}` : null,
      communityImpact:
        i % 2 === 0
          ? `Contributed to community in my own way. (Applicant ${i + 1})`
          : null,
      teamConflict:
        i % 2 === 1
          ? `Resolved team conflicts through communication. (Applicant ${
              i + 1
            })`
          : null,
      heardAboutC4C: [HearAboutC4C.WORD_OF_MOUTH],
      appliedBefore: i % 5 === 0 ? 'Yes' : 'No',
      fallCommitments: `Can commit ${6 + (i % 6)} hours per week. (Applicant ${
        i + 1
      })`,
    });
  }

  return applications;
}

const MOCK_GOOGLE_FORMS = generateMockApplications();

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);
  private readonly cognitoClient: CognitoIdentityProviderClient;

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Admin) private readonly adminRepo: Repository<Admin>,
    // ─── DEV ONLY ─ remove before shipping ─────────────────────────────────────
    @InjectRepository(Recruiter)
    private readonly recruiterRepo: Repository<Recruiter>,
    // ───────────────────────────────────────────────────────────────────────────
    @InjectRepository(ScreeningRubric)
    private readonly screeningRubricRepo: Repository<ScreeningRubric>,
    @InjectRepository(InterviewRubric)
    private readonly interviewRubricRepo: Repository<InterviewRubric>,
    @InjectRepository(Applicant)
    private readonly applicantRepo: Repository<Applicant>,
    @InjectRepository(Application)
    private readonly applicationRepo: Repository<Application>,
    @InjectRepository(Email) private readonly emailRepo: Repository<Email>,
    private readonly rawGoogleFormsService: RawGoogleFormsService,
  ) {
    this.cognitoClient = new CognitoIdentityProviderClient({
      region: CognitoAuthConfig.region,
      credentials: {
        accessKeyId: process.env.NX_AWS_ACCESS_KEY,
        secretAccessKey: process.env.NX_AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  async onApplicationBootstrap() {
    await this.seedAdmin();
    await this.seedRubrics();
    await this.seedEmails();
    await this.seedMockApplications();
    // ─── DEV ONLY ─ remove before shipping ───────────────────────────────────────
    await this.seedMockRecruiters();
    // ─────────────────────────────────────────────────────────────────────────────
  }

  private async seedAdmin() {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      this.logger.warn(
        'ADMIN_EMAIL or ADMIN_PASSWORD not set — skipping admin seed',
      );
      return;
    }

    const existing = await this.userRepo.findOneBy({ email });
    if (existing) {
      this.logger.log('Admin user already exists — skipping seed');
      return;
    }

    try {
      await this.createCognitoUser(email, password);
      await this.createDbUser(email);
      this.logger.log(`Admin user seeded: ${email}`);
    } catch (error) {
      this.logger.error(`Failed to seed admin user: ${error.message}`);
    }
  }

  private async seedRubrics() {
    const seedFilePath = path.join(__dirname, 'rubric-seed.json');

    if (!fs.existsSync(seedFilePath)) {
      this.logger.warn(
        'rubric-seed.json not found — skipping rubric seed. Copy rubric-seed.example.json to rubric-seed.json and fill in the rubric content.',
      );
      return;
    }

    const seedData = JSON.parse(fs.readFileSync(seedFilePath, 'utf-8'));

    const screeningCount = await this.screeningRubricRepo.count();
    if (screeningCount === 0) {
      await this.screeningRubricRepo.save(seedData.screeningRubric);
      this.logger.log('Screening rubric seeded');
    } else {
      this.logger.log('Screening rubric already exists — skipping seed');
    }

    const interviewCount = await this.interviewRubricRepo.count();
    if (interviewCount === 0) {
      await this.interviewRubricRepo.save(seedData.interviewRubrics);
      this.logger.log('Interview rubrics seeded');
    } else {
      this.logger.log('Interview rubrics already exist — skipping seed');
    }
  }

  private async seedEmails() {
    const count = await this.emailRepo.count();
    if (count > 0) {
      this.logger.log('Email templates already exist — skipping seed');
      return;
    }

    const rejectionBody =
      'Dear {{firstName}},\n\nThank you for applying to Code4Community. After careful consideration, we regret to inform you that we will not be moving forward with your application at this time.\n\nWe appreciate the time and effort you put into your application and encourage you to apply again in the future.\n\nBest regards,\nCode4Community';

    const templates = [
      {
        name: 'screening-accepted',
        applicationStage: ApplicationRound.SCREENING,
        decision: FinalDecision.ACCEPTED,
        subject: 'Code4Community {{position}} Interview Invitation',
        body: 'Dear {{firstName}},\n\nCongratulations! We are pleased to invite you to the next stage of our recruitment process for the {{position}} role at Code4Community.\n\nPlease use the following link to schedule your interview: {{calendlyLink}}\n\nWe look forward to speaking with you!\n\nBest regards,\nCode4Community',
      },
      {
        name: 'screening-rejected',
        applicationStage: ApplicationRound.SCREENING,
        decision: FinalDecision.REJECTED,
        subject: 'Code4Community Application Update',
        body: rejectionBody,
      },
      {
        name: 'technical-interview-accepted',
        applicationStage: ApplicationRound.TECHNICAL_INTERVIEW,
        decision: FinalDecision.ACCEPTED,
        subject: 'Code4Community Behavioral Interview Invitation',
        body: 'Dear {{firstName}},\n\nWe are excited to let you know that you have advanced to the behavioral interview stage of our recruitment process at Code4Community.\n\nPlease use the following link to schedule your interview: {{calendlyLink}}\n\nWe look forward to speaking with you!\n\nBest regards,\nCode4Community',
      },
      {
        name: 'technical-interview-rejected',
        applicationStage: ApplicationRound.TECHNICAL_INTERVIEW,
        decision: FinalDecision.REJECTED,
        subject: 'Code4Community Application Update',
        body: rejectionBody,
      },
      {
        name: 'behavioral-interview-accepted',
        applicationStage: ApplicationRound.BEHAVIORAL_INTERVIEW,
        decision: FinalDecision.ACCEPTED,
        subject: 'Congratulations from Code4Community!',
        body: 'Dear {{firstName}},\n\nWe are thrilled to offer you a position at Code4Community! Your skills and enthusiasm impressed us throughout the recruitment process.\n\nPlease reply to this email to confirm your acceptance. We look forward to welcoming you to the team!\n\nBest regards,\nCode4Community',
      },
      {
        name: 'behavioral-interview-rejected',
        applicationStage: ApplicationRound.BEHAVIORAL_INTERVIEW,
        decision: FinalDecision.REJECTED,
        subject: 'Code4Community Application Update',
        body: rejectionBody,
      },
    ];

    for (const template of templates) {
      await this.emailRepo.save(
        this.emailRepo.create({
          ...template,
          requiredVariables: [],
          defaultContext: {},
        }),
      );
    }

    this.logger.log('Email templates seeded');
  }

  private async seedMockApplications() {
    if (process.env.SEED_MOCK_APPLICATIONS !== 'true') {
      return;
    }

    const count = await this.applicationRepo.count();
    if (count > 0) {
      this.logger.log('Mock applications already exist — skipping seed');
      return;
    }

    for (const formDto of MOCK_GOOGLE_FORMS) {
      try {
        await this.rawGoogleFormsService.submitGoogleForm(formDto);
        this.logger.log(`Mock form submitted for: ${formDto.email}`);
      } catch (error) {
        this.logger.warn(
          `Skipping mock form for ${formDto.email}: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Seeded ${MOCK_GOOGLE_FORMS.length} mock Google Form submissions`,
    );
  }

  // ─── DEV ONLY ─ remove before shipping ───────────────────────────────────────
  private async seedMockRecruiters() {
    if (process.env.SEED_MOCK_RECRUITERS !== 'true') {
      return;
    }

    for (const { firstName, lastName, email } of MOCK_RECRUITERS) {
      const existing = await this.userRepo.findOneBy({ email });
      if (existing) continue;

      await this.recruiterRepo.save(
        this.recruiterRepo.create({
          firstName,
          lastName,
          email,
          accountStatus: AccountStatus.ACTIVATED,
        }),
      );
    }

    this.logger.log(
      `Mock recruiters seeded (${MOCK_RECRUITERS.length} users @ c4c.test)`,
    );
  }
  // ─────────────────────────────────────────────────────────────────────────────

  private async createCognitoUser(email: string, password: string) {
    try {
      await this.cognitoClient.send(
        new AdminCreateUserCommand({
          UserPoolId: CognitoAuthConfig.userPoolId,
          Username: email,
          UserAttributes: [
            { Name: 'email', Value: email },
            { Name: 'email_verified', Value: 'true' },
          ],
          MessageAction: 'SUPPRESS',
        }),
      );
    } catch (error) {
      if (error instanceof UsernameExistsException) {
        this.logger.log('Admin already exists in Cognito — setting password');
      } else {
        throw error;
      }
    }

    await this.cognitoClient.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: CognitoAuthConfig.userPoolId,
        Username: email,
        Password: password,
        Permanent: true,
      }),
    );
  }

  private async createDbUser(email: string) {
    const admin = this.adminRepo.create({
      email,
      firstName: 'Ryaken',
      lastName: 'Nakamoto',
      role: Role.ADMIN,
      accountStatus: AccountStatus.ACTIVATED,
    });
    await this.adminRepo.save(admin);
  }
}
