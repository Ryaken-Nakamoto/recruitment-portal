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
import { AcademicYear } from '../applicants/enums/academic-year.enum';
import { ApplicationRound } from '../applications/enums/application-round.enum';
import { RoundStatus } from '../applications/enums/round-status.enum';
import { Email } from '../emails/entities/email.entity';
import { FinalDecision } from '../applications/enums/final-decision.enum';

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

const MOCK_APPLICANTS: Array<
  Omit<Applicant, 'id' | 'createdAt' | 'application'>
> = [
  {
    firstName: 'Alex',
    lastName: 'Chen',
    email: 'alex.chen@example.com',
    graduationYear: 2026,
    academicYear: AcademicYear.THIRD,
    major: 'Computer Science',
  },
  {
    firstName: 'Jordan',
    lastName: 'Patel',
    email: 'jordan.patel@example.com',
    graduationYear: 2027,
    academicYear: AcademicYear.SECOND,
    major: 'Software Engineering',
  },
  {
    firstName: 'Morgan',
    lastName: 'Liu',
    email: 'morgan.liu@example.com',
    graduationYear: 2025,
    academicYear: AcademicYear.FOURTH,
    major: 'Data Science',
  },
  {
    firstName: 'Riley',
    lastName: 'Thompson',
    email: 'riley.thompson@example.com',
    graduationYear: 2026,
    academicYear: AcademicYear.THIRD,
    major: 'Computer Science',
  },
  {
    firstName: 'Casey',
    lastName: 'Nguyen',
    email: 'casey.nguyen@example.com',
    graduationYear: 2028,
    academicYear: AcademicYear.FIRST,
    major: 'Electrical Engineering',
  },
  {
    firstName: 'Sam',
    lastName: 'Rodriguez',
    email: 'sam.rodriguez@example.com',
    graduationYear: 2026,
    academicYear: AcademicYear.THIRD,
    major: 'Information Systems',
  },
  {
    firstName: 'Taylor',
    lastName: 'Kim',
    email: 'taylor.kim@example.com',
    graduationYear: 2027,
    academicYear: AcademicYear.SECOND,
    major: 'Computer Science',
  },
  {
    firstName: 'Drew',
    lastName: 'Okafor',
    email: 'drew.okafor@example.com',
    graduationYear: 2025,
    academicYear: AcademicYear.FOURTH,
    major: 'Cognitive Science',
  },
  {
    firstName: 'Jamie',
    lastName: 'Walsh',
    email: 'jamie.walsh@example.com',
    graduationYear: 2026,
    academicYear: AcademicYear.THIRD,
    major: 'Mathematics & CS',
  },
  {
    firstName: 'Quinn',
    lastName: 'Hernandez',
    email: 'quinn.hernandez@example.com',
    graduationYear: 2027,
    academicYear: AcademicYear.SECOND,
    major: 'Computer Engineering',
  },
  {
    firstName: 'Aisha',
    lastName: 'Hassan',
    email: 'aisha.hassan@example.com',
    graduationYear: 2026,
    academicYear: AcademicYear.THIRD,
    major: 'Computer Science',
  },
  {
    firstName: 'Benjamin',
    lastName: 'Kumar',
    email: 'benjamin.kumar@example.com',
    graduationYear: 2027,
    academicYear: AcademicYear.SECOND,
    major: 'Artificial Intelligence',
  },
  {
    firstName: 'Clara',
    lastName: 'Martinez',
    email: 'clara.martinez@example.com',
    graduationYear: 2025,
    academicYear: AcademicYear.FOURTH,
    major: 'Computer Science',
  },
  {
    firstName: 'Daniel',
    lastName: 'Gao',
    email: 'daniel.gao@example.com',
    graduationYear: 2026,
    academicYear: AcademicYear.THIRD,
    major: 'Software Engineering',
  },
  {
    firstName: 'Elena',
    lastName: 'Rossi',
    email: 'elena.rossi@example.com',
    graduationYear: 2028,
    academicYear: AcademicYear.FIRST,
    major: 'Information Technology',
  },
  {
    firstName: 'Farah',
    lastName: 'Amin',
    email: 'farah.amin@example.com',
    graduationYear: 2026,
    academicYear: AcademicYear.THIRD,
    major: 'Computer Science',
  },
  {
    firstName: 'Gabriel',
    lastName: 'Santos',
    email: 'gabriel.santos@example.com',
    graduationYear: 2027,
    academicYear: AcademicYear.SECOND,
    major: 'Software Engineering',
  },
  {
    firstName: 'Harper',
    lastName: 'Chen',
    email: 'harper.chen@example.com',
    graduationYear: 2025,
    academicYear: AcademicYear.FOURTH,
    major: 'Cybersecurity',
  },
  {
    firstName: 'Isaac',
    lastName: 'Cohen',
    email: 'isaac.cohen@example.com',
    graduationYear: 2026,
    academicYear: AcademicYear.THIRD,
    major: 'Computer Science',
  },
  {
    firstName: 'Jessica',
    lastName: 'Tang',
    email: 'jessica.tang@example.com',
    graduationYear: 2027,
    academicYear: AcademicYear.SECOND,
    major: 'Data Science',
  },
  {
    firstName: 'Kevin',
    lastName: 'Hoffman',
    email: 'kevin.hoffman@example.com',
    graduationYear: 2025,
    academicYear: AcademicYear.FOURTH,
    major: 'Computer Engineering',
  },
  {
    firstName: 'Lily',
    lastName: 'Anderson',
    email: 'lily.anderson@example.com',
    graduationYear: 2026,
    academicYear: AcademicYear.THIRD,
    major: 'Software Engineering',
  },
  {
    firstName: 'Marcus',
    lastName: 'Johnson',
    email: 'marcus.johnson@example.com',
    graduationYear: 2028,
    academicYear: AcademicYear.FIRST,
    major: 'Computer Science',
  },
  {
    firstName: 'Nina',
    lastName: 'Patel',
    email: 'nina.patel@example.com',
    graduationYear: 2026,
    academicYear: AcademicYear.THIRD,
    major: 'Artificial Intelligence',
  },
  {
    firstName: 'Oscar',
    lastName: 'Garcia',
    email: 'oscar.garcia@example.com',
    graduationYear: 2027,
    academicYear: AcademicYear.SECOND,
    major: 'Computer Science',
  },
  {
    firstName: 'Piper',
    lastName: 'Lee',
    email: 'piper.lee@example.com',
    graduationYear: 2025,
    academicYear: AcademicYear.FOURTH,
    major: 'Software Engineering',
  },
  {
    firstName: 'Raj',
    lastName: 'Bansal',
    email: 'raj.bansal@example.com',
    graduationYear: 2026,
    academicYear: AcademicYear.THIRD,
    major: 'Computer Science',
  },
  {
    firstName: 'Sophie',
    lastName: 'Bauer',
    email: 'sophie.bauer@example.com',
    graduationYear: 2027,
    academicYear: AcademicYear.SECOND,
    major: 'Information Systems',
  },
  {
    firstName: 'Thomas',
    lastName: 'Murphy',
    email: 'thomas.murphy@example.com',
    graduationYear: 2025,
    academicYear: AcademicYear.FOURTH,
    major: 'Computer Science',
  },
  {
    firstName: 'Uma',
    lastName: 'Sharma',
    email: 'uma.sharma@example.com',
    graduationYear: 2026,
    academicYear: AcademicYear.THIRD,
    major: 'Data Science',
  },
  {
    firstName: 'Victor',
    lastName: 'Wolf',
    email: 'victor.wolf@example.com',
    graduationYear: 2028,
    academicYear: AcademicYear.FIRST,
    major: 'Computer Engineering',
  },
  {
    firstName: 'Winona',
    lastName: 'Clark',
    email: 'winona.clark@example.com',
    graduationYear: 2026,
    academicYear: AcademicYear.THIRD,
    major: 'Software Engineering',
  },
  {
    firstName: 'Xavier',
    lastName: 'Delgado',
    email: 'xavier.delgado@example.com',
    graduationYear: 2027,
    academicYear: AcademicYear.SECOND,
    major: 'Computer Science',
  },
  {
    firstName: 'Yuki',
    lastName: 'Tanaka',
    email: 'yuki.tanaka@example.com',
    graduationYear: 2025,
    academicYear: AcademicYear.FOURTH,
    major: 'Artificial Intelligence',
  },
  {
    firstName: 'Zoe',
    lastName: 'Patterson',
    email: 'zoe.patterson@example.com',
    graduationYear: 2026,
    academicYear: AcademicYear.THIRD,
    major: 'Computer Science',
  },
  {
    firstName: 'Adrian',
    lastName: 'Novak',
    email: 'adrian.novak@example.com',
    graduationYear: 2027,
    academicYear: AcademicYear.SECOND,
    major: 'Software Engineering',
  },
  {
    firstName: 'Bella',
    lastName: 'Zhao',
    email: 'bella.zhao@example.com',
    graduationYear: 2025,
    academicYear: AcademicYear.FOURTH,
    major: 'Data Science',
  },
  {
    firstName: 'Connor',
    lastName: 'Brady',
    email: 'connor.brady@example.com',
    graduationYear: 2026,
    academicYear: AcademicYear.THIRD,
    major: 'Computer Science',
  },
  {
    firstName: 'Diana',
    lastName: 'Foster',
    email: 'diana.foster@example.com',
    graduationYear: 2028,
    academicYear: AcademicYear.FIRST,
    major: 'Information Technology',
  },
  {
    firstName: 'Ethan',
    lastName: 'Blackwell',
    email: 'ethan.blackwell@example.com',
    graduationYear: 2026,
    academicYear: AcademicYear.THIRD,
    major: 'Software Engineering',
  },
  {
    firstName: 'Fiona',
    lastName: 'Grant',
    email: 'fiona.grant@example.com',
    graduationYear: 2027,
    academicYear: AcademicYear.SECOND,
    major: 'Computer Science',
  },
  {
    firstName: 'Grace',
    lastName: 'Holland',
    email: 'grace.holland@example.com',
    graduationYear: 2025,
    academicYear: AcademicYear.FOURTH,
    major: 'Cybersecurity',
  },
  {
    firstName: 'Hayden',
    lastName: 'Irving',
    email: 'hayden.irving@example.com',
    graduationYear: 2026,
    academicYear: AcademicYear.THIRD,
    major: 'Computer Engineering',
  },
];

const MOCK_ANSWERS = [
  {
    question: 'Why do you want to join Code for Community?',
    answer:
      "I want to use my technical skills to create meaningful impact in underserved communities. C4C's mission of building software for nonprofits aligns perfectly with my belief that technology should be a tool for equity.",
  },
  {
    question: 'Describe a time you worked in a team on a technical project.',
    answer:
      'In my algorithms class, I collaborated with three teammates to build a route optimization tool for a local food bank. I led the backend while coordinating with the frontend team, and we resolved disagreements about data structures through group code reviews and clear documentation.',
  },
  {
    question: 'What past experience do you have that is relevant to this role?',
    answer:
      'I built a full-stack web app using React and Node.js for a community garden in my city. It helped coordinators track volunteer hours and plot assignments, and is currently used by over 80 volunteers.',
  },
  {
    question: 'What do you hope to gain from this experience?',
    answer:
      "I hope to deepen my full-stack development skills while working on real-world projects that matter. I'm also excited to collaborate with a team that shares a commitment to social good.",
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

    for (const applicantData of MOCK_APPLICANTS) {
      const applicant = this.applicantRepo.create(applicantData);
      const savedApplicant = await this.applicantRepo.save(applicant);

      const application = this.applicationRepo.create({
        applicant: savedApplicant,
        answers: MOCK_ANSWERS,
        round: ApplicationRound.SCREENING,
        roundStatus: RoundStatus.PENDING,
        finalDecision: null,
      });
      await this.applicationRepo.save(application);
    }

    this.logger.log(
      `Seeded ${MOCK_APPLICANTS.length} mock applications in SCREENING round`,
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
