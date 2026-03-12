import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Relation } from 'typeorm';

import { ApplicationsService } from './applications.service';
import { Application } from './entities/application.entity';
import { Applicant } from '../applicants/entities/applicant.entity';
import { RawGoogleForm } from '../raw-google-forms/entities/raw-google-form.entity';
import { AcademicYear } from '../applicants/enums/academic-year.enum';
import { ApplicationRound } from './enums/application-round.enum';
import { RoundStatus } from './enums/round-status.enum';
import { FormYear } from '../raw-google-forms/enums/form-year.enum';
import { College } from '../raw-google-forms/enums/college.enum';
import { NotFoundException } from '@nestjs/common';

describe('ApplicationsService', () => {
  let service: ApplicationsService;
  let applicationRepo: jest.Mocked<Repository<Application>>;

  beforeEach(async () => {
    const mockApplicationRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn(),
      findAndCount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        {
          provide: getRepositoryToken(Application),
          useValue: mockApplicationRepo,
        },
      ],
    }).compile();

    service = module.get<ApplicationsService>(ApplicationsService);
    applicationRepo = module.get(getRepositoryToken(Application));
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
      expect(result.rawGoogleForm.resumeUrl).toBe(
        'https://example.com/resume.pdf',
      );
    });

    it('throws NotFoundException when application not found', async () => {
      applicationRepo.findOne.mockResolvedValue(null);

      await expect(service.findOneDetail(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
