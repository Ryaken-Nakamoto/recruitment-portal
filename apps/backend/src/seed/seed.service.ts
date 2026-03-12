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
  { firstName: 'Alice', lastName: 'Park', email: 'alice.park@dev.local' },
  { firstName: 'Ben', lastName: 'Torres', email: 'ben.torres@dev.local' },
  { firstName: 'Claire', lastName: 'Novak', email: 'claire.novak@dev.local' },
  { firstName: 'David', lastName: 'Singh', email: 'david.singh@dev.local' },
  { firstName: 'Emma', lastName: 'Osei', email: 'emma.osei@dev.local' },
  {
    firstName: 'Felix',
    lastName: 'Yamamoto',
    email: 'felix.yamamoto@dev.local',
  },
  { firstName: 'Grace', lastName: 'Murphy', email: 'grace.murphy@dev.local' },
  {
    firstName: 'Henry',
    lastName: 'Kowalski',
    email: 'henry.kowalski@dev.local',
  },
  { firstName: 'Isla', lastName: 'Santos', email: 'isla.santos@dev.local' },
  { firstName: 'James', lastName: 'Okonkwo', email: 'james.okonkwo@dev.local' },
];
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_RESUME_URL =
  'https://recruitment-portal-resumes-12324123t51234.s3.us-east-1.amazonaws.com/resumes/04f73eb0-c49d-4cb6-818c-7eb39538bfb4-Ryaken_Nakamoto_AI_Resume - Ryaken Nakamoto.pdf';

const MOCK_GOOGLE_FORMS: SubmitGoogleFormDto[] = [
  {
    email: 'alex.chen@example.com',
    fullName: 'Alex Chen',
    year: FormYear.THIRD,
    college: College.KHOURY,
    major: 'Computer Science',
    codingExperience: [
      CodingExperience.FUNDIES_1,
      CodingExperience.FUNDIES_2,
      CodingExperience.OOD,
    ],
    resumeUrl: MOCK_RESUME_URL,
    whyC4C:
      "I want to use my technical skills to create meaningful impact in underserved communities. C4C's mission of building software for nonprofits aligns perfectly with my belief that technology should be a tool for equity.",
    selfStartedProject:
      'Built a meal-planning app for a local food bank using React and Express.',
    communityImpact:
      'Volunteered at a coding bootcamp for underrepresented high school students for two semesters.',
    teamConflict:
      'During a group project, two teammates disagreed on the database schema. I facilitated a meeting where we listed pros and cons of each approach and reached a consensus.',
    heardAboutC4C: [HearAboutC4C.INSTAGRAM, HearAboutC4C.WORD_OF_MOUTH],
    appliedBefore: 'No',
    fallCommitments: 'I can commit 8-10 hours per week. No major conflicts.',
  },
  {
    email: 'jordan.patel@example.com',
    fullName: 'Jordan Patel',
    year: FormYear.SECOND,
    college: College.KHOURY,
    major: 'Software Engineering',
    codingExperience: [CodingExperience.FUNDIES_1, CodingExperience.FUNDIES_2],
    resumeUrl: MOCK_RESUME_URL,
    whyC4C:
      'I believe technology should serve everyone, not just those who can afford it. C4C gives me the chance to build real products that help real people.',
    selfStartedProject: null,
    communityImpact:
      'Organized a hackathon focused on civic tech solutions for local nonprofits.',
    teamConflict:
      'When a teammate missed a deadline, I reached out privately to understand their situation and helped redistribute tasks so we could still deliver on time.',
    heardAboutC4C: [HearAboutC4C.EVENT],
    appliedBefore: 'No',
    fallCommitments:
      'Taking 4 courses but flexible on weekends. About 6-8 hours per week.',
  },
  {
    email: 'morgan.liu@example.com',
    fullName: 'Morgan Liu',
    year: FormYear.FOURTH,
    college: College.ENGINEERING,
    major: 'Data Science',
    codingExperience: [
      CodingExperience.FUNDIES_1,
      CodingExperience.FUNDIES_2,
      CodingExperience.OOD,
      CodingExperience.DATABASES,
    ],
    resumeUrl: MOCK_RESUME_URL,
    whyC4C:
      'As a senior, I want to leave a lasting impact at Northeastern. C4C lets me apply everything I have learned to projects that matter beyond the classroom.',
    selfStartedProject:
      'Created a dashboard for a nonprofit to visualize donation trends using Python and D3.js.',
    communityImpact: null,
    teamConflict: null,
    heardAboutC4C: [HearAboutC4C.KHOURY_WEBSITE],
    appliedBefore: 'Yes',
    fallCommitments:
      'Light course load senior year. Can do 10+ hours per week.',
  },
  {
    email: 'riley.thompson@example.com',
    fullName: 'Riley Thompson',
    year: FormYear.THIRD,
    college: College.KHOURY,
    major: 'Computer Science',
    codingExperience: [
      CodingExperience.FUNDIES_1,
      CodingExperience.FUNDIES_2,
      CodingExperience.OOD,
      CodingExperience.SOFTWARE_DEVELOPMENT,
    ],
    resumeUrl: MOCK_RESUME_URL,
    whyC4C:
      'I have always been passionate about using code for social good. C4C is the perfect place to combine my love for software development with community impact.',
    selfStartedProject:
      'Built a volunteer coordination platform for a local shelter using Next.js.',
    communityImpact:
      'Tutored CS students from underrepresented backgrounds through the Khoury mentorship program.',
    teamConflict:
      'In a hackathon, our team had conflicting ideas for the project direction. I suggested we each prototype our ideas for 30 minutes and then vote on the strongest approach.',
    heardAboutC4C: [HearAboutC4C.MEMBER_REFERRAL],
    heardAboutC4COther: 'Sarah Kim',
    appliedBefore: 'No',
    fallCommitments: 'Available 8 hours per week, no co-op this semester.',
  },
  {
    email: 'casey.nguyen@example.com',
    fullName: 'Casey Nguyen',
    year: FormYear.FIRST,
    college: College.KHOURY,
    major: 'Computer Science',
    codingExperience: [CodingExperience.FUNDIES_1],
    resumeUrl: MOCK_RESUME_URL,
    whyC4C:
      'Even though I am just starting out, I want to contribute to meaningful projects and learn from experienced developers. C4C seems like the best way to grow while giving back.',
    selfStartedProject: null,
    communityImpact:
      'Led a fundraising campaign for a local literacy nonprofit in high school, raising over $3,000.',
    teamConflict: null,
    heardAboutC4C: [HearAboutC4C.EVENT, HearAboutC4C.INSTAGRAM],
    appliedBefore: 'No',
    fallCommitments:
      'First-year schedule is flexible. I can commit 6-8 hours per week.',
  },
  {
    email: 'sam.rodriguez@example.com',
    fullName: 'Sam Rodriguez',
    year: FormYear.THIRD,
    college: College.CSSH,
    major: 'Information Systems',
    codingExperience: [
      CodingExperience.WEB_DEVELOPMENT,
      CodingExperience.DATABASES,
      CodingExperience.OTHER,
    ],
    codingExperienceOther:
      'Self-taught React and Node.js through online courses',
    resumeUrl: MOCK_RESUME_URL,
    whyC4C:
      'Coming from a non-traditional CS background, I want to prove that impactful software can be built by anyone with the drive to learn. C4C values collaboration over pedigree.',
    selfStartedProject:
      'Built a budgeting tool for first-generation college students using the MERN stack.',
    communityImpact:
      'Mentored first-generation students through the transition to college life.',
    teamConflict:
      'A teammate and I had different coding styles. We agreed on a linting config and established code review norms so we could focus on substance over style.',
    heardAboutC4C: [HearAboutC4C.WORD_OF_MOUTH],
    appliedBefore: 'No',
    fallCommitments:
      'Part-time job 10 hrs/week but can still commit 6 hours to C4C.',
  },
  {
    email: 'taylor.kim@example.com',
    fullName: 'Taylor Kim',
    year: FormYear.SECOND,
    college: College.KHOURY,
    major: 'Computer Science',
    codingExperience: [CodingExperience.FUNDIES_1, CodingExperience.FUNDIES_2],
    resumeUrl: MOCK_RESUME_URL,
    whyC4C:
      'I want hands-on experience building production software while making a difference. C4C offers both in a supportive environment.',
    selfStartedProject: null,
    communityImpact: null,
    teamConflict:
      'When two group members stopped contributing, I scheduled a check-in to understand blockers and helped break tasks into smaller pieces so everyone could participate.',
    heardAboutC4C: [HearAboutC4C.INSTAGRAM],
    appliedBefore: 'No',
    fallCommitments: 'No major commitments. 8-10 hours per week available.',
  },
  {
    email: 'drew.okafor@example.com',
    fullName: 'Drew Okafor',
    year: FormYear.FOURTH,
    college: College.KHOURY,
    major: 'Cognitive Science',
    codingExperience: [
      CodingExperience.FUNDIES_1,
      CodingExperience.FUNDIES_2,
      CodingExperience.OOD,
      CodingExperience.SOFTWARE_ENGINEERING,
    ],
    resumeUrl: MOCK_RESUME_URL,
    whyC4C:
      'My background in cognitive science gives me a unique perspective on user-centered design. I want to bring that lens to C4C projects to make software that is truly accessible.',
    selfStartedProject:
      'Designed and built a cognitive accessibility testing tool for web applications.',
    communityImpact:
      "Ran UX workshops for nonprofit staff to help them better understand their users' digital needs.",
    teamConflict:
      'During a co-op project, stakeholders had conflicting requirements. I organized a prioritization session using MoSCoW method to align everyone.',
    heardAboutC4C: [HearAboutC4C.KHOURY_WEBSITE, HearAboutC4C.WORD_OF_MOUTH],
    appliedBefore: 'Yes',
    fallCommitments: 'Senior year, light load. 10+ hours per week easily.',
  },
  {
    email: 'jamie.walsh@example.com',
    fullName: 'Jamie Walsh',
    year: FormYear.THIRD,
    college: College.KHOURY,
    major: 'Mathematics & CS',
    codingExperience: [
      CodingExperience.FUNDIES_1,
      CodingExperience.FUNDIES_2,
      CodingExperience.OOD,
      CodingExperience.INTERMEDIATE_DATA,
    ],
    resumeUrl: MOCK_RESUME_URL,
    whyC4C:
      'I love the intersection of math and software. C4C projects let me apply analytical thinking to real-world problems that affect my community.',
    selfStartedProject:
      'Built an algorithm to optimize volunteer shift scheduling for a local hospital.',
    communityImpact:
      'Tutored students in discrete math and helped them see connections to real software problems.',
    teamConflict: null,
    heardAboutC4C: [HearAboutC4C.MEMBER_REFERRAL],
    heardAboutC4COther: 'Alex Chen',
    appliedBefore: 'No',
    fallCommitments:
      'Available 8 hours per week. No co-op or major extracurriculars.',
  },
  {
    email: 'quinn.hernandez@example.com',
    fullName: 'Quinn Hernandez',
    year: FormYear.SECOND,
    college: College.ENGINEERING,
    major: 'Computer Engineering',
    codingExperience: [
      CodingExperience.FUNDIES_1,
      CodingExperience.FUNDIES_2,
      CodingExperience.OTHER,
    ],
    codingExperienceOther: 'Embedded systems programming in C',
    resumeUrl: MOCK_RESUME_URL,
    whyC4C:
      'I want to branch out from hardware into full-stack development, and doing it for a good cause makes it even more meaningful.',
    selfStartedProject: null,
    communityImpact:
      'Built a low-cost IoT air quality monitor and deployed it in three community centers.',
    teamConflict:
      'A teammate pushed code that broke the build right before a demo. Instead of blaming, I helped them fix it and we added a CI check to prevent it in the future.',
    heardAboutC4C: [HearAboutC4C.EVENT],
    appliedBefore: 'No',
    fallCommitments:
      'Engineering course load is heavy but I can do 6 hours per week.',
    questionsOrConcerns:
      'Is there flexibility in which project team I join? I am interested in the data-focused projects.',
  },
];

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
      `Mock recruiters seeded (${MOCK_RECRUITERS.length} users @ *.dev.local)`,
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
