import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In, Repository, Relation, SelectQueryBuilder } from 'typeorm';
import { Readable } from 'stream';

import { ApplicationsService } from './applications.service';
import { Application } from './entities/application.entity';
import { Assignment } from './entities/assignment.entity';
import { ScreeningReview } from './entities/screening-review.entity';
import { ScreeningReviewScore } from './entities/screening-review-score.entity';
import { Applicant } from '../applicants/entities/applicant.entity';
import { RawGoogleForm } from '../raw-google-forms/entities/raw-google-form.entity';
import { AcademicYear } from '../applicants/enums/academic-year.enum';
import { ApplicationRound } from './enums/application-round.enum';
import { RoundStatus } from './enums/round-status.enum';
import { FormYear } from '../raw-google-forms/enums/form-year.enum';
import { College } from '../raw-google-forms/enums/college.enum';
import { NotFoundException } from '@nestjs/common';
import { S3Service } from '../util/s3/s3.service';

describe('ApplicationsService', () => {
  let service: ApplicationsService;
  let applicationRepo: jest.Mocked<Repository<Application>>;
  let assignmentRepo: jest.Mocked<Repository<Assignment>>;
  let screeningReviewRepo: jest.Mocked<Repository<ScreeningReview>>;
  let mockS3Service: { getResume: jest.Mock };

  beforeEach(async () => {
    const mockApplicationRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn(),
      findAndCount: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockAssignmentRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    const mockScreeningReviewRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    mockS3Service = { getResume: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        {
          provide: getRepositoryToken(Application),
          useValue: mockApplicationRepo,
        },
        {
          provide: getRepositoryToken(Assignment),
          useValue: mockAssignmentRepo,
        },
        {
          provide: getRepositoryToken(ScreeningReview),
          useValue: mockScreeningReviewRepo,
        },
        {
          provide: S3Service,
          useValue: mockS3Service,
        },
      ],
    }).compile();

    service = module.get<ApplicationsService>(ApplicationsService);
    applicationRepo = module.get(getRepositoryToken(Application));
    assignmentRepo = module.get(getRepositoryToken(Assignment));
    screeningReviewRepo = module.get(getRepositoryToken(ScreeningReview));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOrCreate', () => {
    const mockApplicant: Applicant = {
      id: 1,
      email: 'test@example.com',
      name: 'Alice Smith',
      major: 'CS',
      academicYear: AcademicYear.FIRST,
      createdAt: new Date(),
      application: undefined as unknown as Relation<Application>,
    };

    const mockRawForm: RawGoogleForm = {
      id: 1,
      email: 'test@example.com',
      fullName: 'Alice Smith',
      year: FormYear.FIRST,
      college: College.ENGINEERING,
      major: 'CS',
      codingExperience: [],
      codingExperienceOther: null,
      resumeUrl: 'https://example.com/resume.pdf',
      whyC4C: 'I want to help',
      selfStartedProject: null,
      communityImpact: null,
      teamConflict: null,
      otherExperiences: null,
      heardAboutC4C: [],
      heardAboutC4COther: null,
      appliedBefore: 'no',
      fallCommitments: 'Full time',
      questionsOrConcerns: null,
      submittedAt: new Date(),
      application: undefined as unknown as Relation<Application>,
    };

    it('creates a new application when one does not exist', async () => {
      applicationRepo.findOne.mockResolvedValue(null);
      const mockCreated: Application = {
        id: 1,
        applicant: mockApplicant,
        rawGoogleForm: mockRawForm,
        round: ApplicationRound.SCREENING,
        roundStatus: RoundStatus.PENDING,
        finalDecision: null,
        submittedAt: new Date(),
      };
      applicationRepo.save.mockResolvedValue(mockCreated);

      const result = await service.findOrCreate(mockApplicant, mockRawForm);

      expect(result.created).toBe(true);
      expect(result.application).toEqual(mockCreated);
      expect(applicationRepo.findOne).toHaveBeenCalledWith({
        where: { applicant: { id: mockApplicant.id } },
      });
      expect(applicationRepo.create).toHaveBeenCalledWith({
        applicant: mockApplicant,
        rawGoogleForm: mockRawForm,
      });
      expect(applicationRepo.save).toHaveBeenCalled();
    });

    it('returns existing application without creating', async () => {
      const mockExisting: Application = {
        id: 5,
        applicant: mockApplicant,
        rawGoogleForm: mockRawForm,
        round: ApplicationRound.SCREENING,
        roundStatus: RoundStatus.IN_PROGRESS,
        finalDecision: null,
        submittedAt: new Date(),
      };
      applicationRepo.findOne.mockResolvedValue(mockExisting);

      const result = await service.findOrCreate(mockApplicant, mockRawForm);

      expect(result.created).toBe(false);
      expect(result.application).toEqual(mockExisting);
      expect(applicationRepo.findOne).toHaveBeenCalledWith({
        where: { applicant: { id: mockApplicant.id } },
      });
      expect(applicationRepo.create).not.toHaveBeenCalled();
      expect(applicationRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('listAll', () => {
    const mockApplicant1: Applicant = {
      id: 1,
      email: 'alice@example.com',
      name: 'Alice Smith',
      major: 'CS',
      academicYear: AcademicYear.FIRST,
      createdAt: new Date(),
      application: undefined as unknown as Relation<Application>,
    };

    const mockApplicant2: Applicant = {
      id: 2,
      email: 'bob@example.com',
      name: 'Bob Jones',
      major: 'Math',
      academicYear: AcademicYear.SECOND,
      createdAt: new Date(),
      application: undefined as unknown as Relation<Application>,
    };

    it('returns paginated applications with applicant details', async () => {
      const mockApps: Application[] = [
        {
          id: 1,
          applicant: mockApplicant1,
          rawGoogleForm: undefined as unknown as Relation<RawGoogleForm>,
          round: ApplicationRound.SCREENING,
          roundStatus: RoundStatus.PENDING,
          finalDecision: null,
          submittedAt: new Date('2026-03-01'),
        },
        {
          id: 2,
          applicant: mockApplicant2,
          rawGoogleForm: undefined as unknown as Relation<RawGoogleForm>,
          round: ApplicationRound.TECHNICAL_INTERVIEW,
          roundStatus: RoundStatus.IN_PROGRESS,
          finalDecision: null,
          submittedAt: new Date('2026-03-02'),
        },
      ];

      applicationRepo.findAndCount.mockResolvedValue([mockApps, 2]);

      const result = await service.listAll(1, 20);

      expect(applicationRepo.findAndCount).toHaveBeenCalledWith({
        relations: ['applicant'],
        where: {},
        skip: 0,
        take: 20,
        order: { submittedAt: 'DESC' },
      });
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.data[0].applicant.name).toBe('Alice Smith');
      expect(result.data[0].applicant.email).toBe('alice@example.com');
    });

    it('calculates correct pagination for page 2', async () => {
      applicationRepo.findAndCount.mockResolvedValue([[], 50]);

      const result = await service.listAll(2, 20);

      expect(applicationRepo.findAndCount).toHaveBeenCalledWith({
        relations: ['applicant'],
        where: {},
        skip: 20,
        take: 20,
        order: { submittedAt: 'DESC' },
      });
      expect(result.page).toBe(2);
      expect(result.totalPages).toBe(3);
    });

    it('returns empty result when no applications exist', async () => {
      applicationRepo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.listAll(1, 20);

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('returns averageScore null when no reviews are submitted', async () => {
      const mockApps: Application[] = [
        {
          id: 1,
          applicant: mockApplicant1,
          rawGoogleForm: undefined as unknown as Relation<RawGoogleForm>,
          round: ApplicationRound.SCREENING,
          roundStatus: RoundStatus.IN_PROGRESS,
          finalDecision: null,
          submittedAt: new Date('2026-03-01'),
        },
      ];
      applicationRepo.findAndCount.mockResolvedValue([mockApps, 1]);

      const result = await service.listAll(1, 20);

      expect(result.data[0].averageScore).toBeNull();
    });

    it('returns averageScore null when only some reviewers have submitted', async () => {
      const mockApp: Application = {
        id: 1,
        applicant: mockApplicant1,
        rawGoogleForm: undefined as unknown as Relation<RawGoogleForm>,
        round: ApplicationRound.SCREENING,
        roundStatus: RoundStatus.IN_PROGRESS,
        finalDecision: null,
        submittedAt: new Date('2026-03-01'),
      };
      applicationRepo.findAndCount.mockResolvedValue([[mockApp], 1]);
      assignmentRepo.find.mockResolvedValue([
        { id: 10, application: { id: 1 } } as unknown as Assignment,
        { id: 11, application: { id: 1 } } as unknown as Assignment,
      ]);
      // Only 1 of 2 submitted
      screeningReviewRepo.find.mockResolvedValue([
        {
          assignment: { id: 10 },
          scores: [{ score: 2 } as unknown as ScreeningReviewScore],
        } as unknown as ScreeningReview,
      ]);

      const result = await service.listAll(1, 20);

      expect(result.data[0].averageScore).toBeNull();
    });

    it('computes averageScore when all reviewers have submitted', async () => {
      const mockApp: Application = {
        id: 1,
        applicant: mockApplicant1,
        rawGoogleForm: undefined as unknown as Relation<RawGoogleForm>,
        round: ApplicationRound.SCREENING,
        roundStatus: RoundStatus.AWAITING_ADMIN,
        finalDecision: null,
        submittedAt: new Date('2026-03-01'),
      };
      applicationRepo.findAndCount.mockResolvedValue([[mockApp], 1]);
      assignmentRepo.find.mockResolvedValue([
        { id: 10, application: { id: 1 } } as unknown as Assignment,
        { id: 11, application: { id: 1 } } as unknown as Assignment,
      ]);
      screeningReviewRepo.find.mockResolvedValue([
        {
          assignment: { id: 10 },
          scores: [
            { score: 2 } as unknown as ScreeningReviewScore,
            { score: 3 } as unknown as ScreeningReviewScore,
          ],
        } as unknown as ScreeningReview,
        {
          assignment: { id: 11 },
          scores: [
            { score: 1 } as unknown as ScreeningReviewScore,
            { score: 2 } as unknown as ScreeningReviewScore,
          ],
        } as unknown as ScreeningReview,
      ]);

      const result = await service.listAll(1, 20);

      // (2 + 3 + 1 + 2) / 4 = 2.0
      expect(result.data[0].averageScore).toBe(2);
    });

    it('rounds averageScore to 2 decimal places', async () => {
      const mockApp: Application = {
        id: 1,
        applicant: mockApplicant1,
        rawGoogleForm: undefined as unknown as Relation<RawGoogleForm>,
        round: ApplicationRound.SCREENING,
        roundStatus: RoundStatus.AWAITING_ADMIN,
        finalDecision: null,
        submittedAt: new Date('2026-03-01'),
      };
      applicationRepo.findAndCount.mockResolvedValue([[mockApp], 1]);
      assignmentRepo.find.mockResolvedValue([
        { id: 10, application: { id: 1 } } as unknown as Assignment,
      ]);
      screeningReviewRepo.find.mockResolvedValue([
        {
          assignment: { id: 10 },
          scores: [
            { score: 1 } as unknown as ScreeningReviewScore,
            { score: 1 } as unknown as ScreeningReviewScore,
            { score: 2 } as unknown as ScreeningReviewScore,
          ],
        } as unknown as ScreeningReview,
      ]);

      const result = await service.listAll(1, 20);

      // (1 + 1 + 2) / 3 = 1.33
      expect(result.data[0].averageScore).toBe(1.33);
    });

    it('filters by roundStatus when provided', async () => {
      applicationRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.listAll(1, 20, RoundStatus.PENDING);

      expect(applicationRepo.findAndCount).toHaveBeenCalledWith({
        relations: ['applicant'],
        where: { roundStatus: RoundStatus.PENDING },
        skip: 0,
        take: 20,
        order: { submittedAt: 'DESC' },
      });
    });

    it('does not filter when roundStatus is undefined', async () => {
      applicationRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.listAll(1, 20, undefined);

      expect(applicationRepo.findAndCount).toHaveBeenCalledWith({
        relations: ['applicant'],
        where: {},
        skip: 0,
        take: 20,
        order: { submittedAt: 'DESC' },
      });
    });

    describe('sortAvgScore', () => {
      // Builds a mock QueryBuilder that returns raw sorted IDs from getRawMany()
      function buildMockQb(rawIds: { id: string }[] = []) {
        const mockQb = {
          select: jest.fn().mockReturnThis(),
          leftJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          groupBy: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          getRawMany: jest.fn().mockResolvedValue(rawIds),
        };
        applicationRepo.createQueryBuilder.mockReturnValue(
          mockQb as unknown as SelectQueryBuilder<Application>,
        );
        return mockQb;
      }

      it('uses QueryBuilder when sortAvgScore is provided', async () => {
        const mockQb = buildMockQb();

        await service.listAll(1, 20, undefined, 'desc');

        expect(applicationRepo.createQueryBuilder).toHaveBeenCalledWith('app');
        expect(mockQb.getRawMany).toHaveBeenCalled();
        expect(applicationRepo.findAndCount).not.toHaveBeenCalled();
      });

      it('uses findAndCount when sortAvgScore is not provided', async () => {
        applicationRepo.findAndCount.mockResolvedValue([[], 0]);

        await service.listAll(1, 20, undefined, undefined);

        expect(applicationRepo.findAndCount).toHaveBeenCalled();
        expect(applicationRepo.createQueryBuilder).not.toHaveBeenCalled();
      });

      it('orders ASC when sortAvgScore is asc', async () => {
        const mockQb = buildMockQb();

        await service.listAll(1, 20, undefined, 'asc');

        expect(mockQb.orderBy).toHaveBeenCalledWith(
          'AVG(score.score)',
          'ASC',
          'NULLS LAST',
        );
      });

      it('orders DESC when sortAvgScore is desc', async () => {
        const mockQb = buildMockQb();

        await service.listAll(1, 20, undefined, 'desc');

        expect(mockQb.orderBy).toHaveBeenCalledWith(
          'AVG(score.score)',
          'DESC',
          'NULLS LAST',
        );
      });

      it('applies roundStatus filter via where when provided', async () => {
        const mockQb = buildMockQb();

        await service.listAll(1, 20, RoundStatus.AWAITING_ADMIN, 'desc');

        expect(mockQb.where).toHaveBeenCalledWith(
          'app.roundStatus = :roundStatus',
          { roundStatus: RoundStatus.AWAITING_ADMIN },
        );
      });

      it('does not call where when roundStatus is undefined', async () => {
        const mockQb = buildMockQb();

        await service.listAll(1, 20, undefined, 'desc');

        expect(mockQb.where).not.toHaveBeenCalled();
      });

      it('returns same DTO shape as findAndCount path', async () => {
        const mockApplicant: Applicant = {
          id: 1,
          email: 'alice@example.com',
          name: 'Alice Smith',
          major: 'CS',
          academicYear: AcademicYear.FIRST,
          createdAt: new Date(),
          application: undefined as unknown as Relation<Application>,
        };
        const mockApp: Application = {
          id: 1,
          applicant: mockApplicant,
          rawGoogleForm: undefined as unknown as Relation<RawGoogleForm>,
          round: ApplicationRound.SCREENING,
          roundStatus: RoundStatus.AWAITING_ADMIN,
          finalDecision: null,
          submittedAt: new Date('2026-03-01'),
        };
        buildMockQb([{ id: '1' }]);
        applicationRepo.find.mockResolvedValue([mockApp]);

        const result = await service.listAll(
          1,
          20,
          RoundStatus.AWAITING_ADMIN,
          'desc',
        );

        expect(result.total).toBe(1);
        expect(result.data[0].id).toBe(1);
        expect(result.data[0].applicant.name).toBe('Alice Smith');
      });

      it('paginates correctly using sliced IDs', async () => {
        // Page 2, limit 2, from 5 total sorted IDs
        buildMockQb([
          { id: '10' },
          { id: '20' },
          { id: '30' },
          { id: '40' },
          { id: '50' },
        ]);
        applicationRepo.find.mockResolvedValue([]);

        const result = await service.listAll(2, 2, undefined, 'desc');

        // total = 5, page 2 of 2 → IDs 30, 40
        expect(result.total).toBe(5);
        expect(result.totalPages).toBe(3);
        expect(applicationRepo.find).toHaveBeenCalledWith(
          expect.objectContaining({ where: { id: In([30, 40]) } }),
        );
      });

      it('returns empty data when pagedIds is empty', async () => {
        buildMockQb([]); // no IDs

        const result = await service.listAll(1, 20, undefined, 'desc');

        expect(result.total).toBe(0);
        expect(result.data).toHaveLength(0);
        expect(applicationRepo.find).not.toHaveBeenCalled();
      });
    });
  });

  describe('findOneDetail', () => {
    const mockApplicant: Applicant = {
      id: 1,
      email: 'test@example.com',
      name: 'Alice Smith',
      major: 'CS',
      academicYear: AcademicYear.FIRST,
      createdAt: new Date(),
      application: undefined as unknown as Relation<Application>,
    };

    const mockRawForm: RawGoogleForm = {
      id: 1,
      email: 'test@example.com',
      fullName: 'Alice Smith',
      year: FormYear.FIRST,
      college: College.ENGINEERING,
      major: 'CS',
      codingExperience: [],
      codingExperienceOther: null,
      resumeUrl: 'https://example.com/resume.pdf',
      whyC4C: 'I want to help',
      selfStartedProject: null,
      communityImpact: null,
      teamConflict: null,
      otherExperiences: null,
      heardAboutC4C: [],
      heardAboutC4COther: null,
      appliedBefore: 'no',
      fallCommitments: 'Full time',
      questionsOrConcerns: null,
      submittedAt: new Date(),
      application: undefined as unknown as Relation<Application>,
    };

    it('returns application with applicant and raw form', async () => {
      const mockApp: Application = {
        id: 1,
        applicant: mockApplicant,
        rawGoogleForm: mockRawForm,
        round: ApplicationRound.SCREENING,
        roundStatus: RoundStatus.PENDING,
        finalDecision: null,
        submittedAt: new Date(),
      };
      applicationRepo.findOne.mockResolvedValue(mockApp);

      const result = await service.findOneDetail(1);

      expect(applicationRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['applicant', 'rawGoogleForm'],
      });
      expect(result.id).toBe(1);
      expect(result.applicant.name).toBe('Alice Smith');
      expect(result.applicant.email).toBe('test@example.com');
      expect(result.rawGoogleForm.whyC4C).toBe('I want to help');
    });

    it('throws NotFoundException when application not found', async () => {
      applicationRepo.findOne.mockResolvedValue(null);

      await expect(service.findOneDetail(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getResumeStream', () => {
    const mockApplicant: Applicant = {
      id: 1,
      email: 'test@example.com',
      name: 'Alice Smith',
      major: 'CS',
      academicYear: AcademicYear.FIRST,
      createdAt: new Date(),
      application: undefined as unknown as Relation<Application>,
    };

    const mockRawForm: RawGoogleForm = {
      id: 1,
      email: 'test@example.com',
      fullName: 'Alice Smith',
      year: FormYear.FIRST,
      college: College.ENGINEERING,
      major: 'CS',
      codingExperience: [],
      codingExperienceOther: null,
      resumeUrl:
        'https://bucket.s3.us-east-1.amazonaws.com/resumes/4491c8c4-e632-4895-834d-886b5b681117-abc-resume.pdf',
      whyC4C: 'I want to help',
      selfStartedProject: null,
      communityImpact: null,
      teamConflict: null,
      otherExperiences: null,
      heardAboutC4C: [],
      heardAboutC4COther: null,
      appliedBefore: 'no',
      fallCommitments: 'Full time',
      questionsOrConcerns: null,
      submittedAt: new Date(),
      application: undefined as unknown as Relation<Application>,
    };

    it('returns stream and filename for valid application', async () => {
      const fakeStream = Readable.from(['pdf']);
      const mockApp: Application = {
        id: 1,
        applicant: mockApplicant,
        rawGoogleForm: mockRawForm,
        round: ApplicationRound.SCREENING,
        roundStatus: RoundStatus.PENDING,
        finalDecision: null,
        submittedAt: new Date(),
      };
      applicationRepo.findOne.mockResolvedValue(mockApp);
      mockS3Service.getResume.mockResolvedValue(fakeStream);

      const result = await service.getResumeStream(1);

      expect(mockS3Service.getResume).toHaveBeenCalledWith(
        'resumes/4491c8c4-e632-4895-834d-886b5b681117-abc-resume.pdf',
      );
      expect(result.stream).toBe(fakeStream);
      expect(result.filename).toBe('abc-resume.pdf');
    });

    it('throws NotFoundException when application not found', async () => {
      applicationRepo.findOne.mockResolvedValue(null);

      await expect(service.getResumeStream(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
