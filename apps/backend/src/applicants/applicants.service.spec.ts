import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ApplicantsService } from './applicants.service';
import { Applicant } from './entities/applicant.entity';
import { AcademicYear } from './enums/academic-year.enum';
import { FormYear } from '../raw-google-forms/enums/form-year.enum';

describe('ApplicantsService', () => {
  let service: ApplicantsService;
  let applicantRepo: jest.Mocked<Repository<Applicant>>;

  beforeEach(async () => {
    const mockApplicantRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicantsService,
        {
          provide: getRepositoryToken(Applicant),
          useValue: mockApplicantRepo,
        },
      ],
    }).compile();

    service = module.get<ApplicantsService>(ApplicantsService);
    applicantRepo = module.get(getRepositoryToken(Applicant));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOrCreate', () => {
    it('creates a new applicant when one does not exist', async () => {
      applicantRepo.findOne.mockResolvedValue(null);
      const mockCreated: Applicant = {
        id: 1,
        email: 'new@example.com',
        name: 'Alice Smith',
        major: 'Computer Science',
        academicYear: AcademicYear.FIRST,
        graduationYear: null,
        createdAt: new Date(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        application: undefined as any,
      };
      applicantRepo.save.mockResolvedValue(mockCreated);

      const result = await service.findOrCreate({
        email: 'new@example.com',
        name: 'Alice Smith',
        major: 'Computer Science',
        year: FormYear.FIRST,
      });

      expect(result.created).toBe(true);
      expect(result.applicant).toEqual(mockCreated);
      expect(applicantRepo.findOne).toHaveBeenCalledWith({
        where: { email: 'new@example.com' },
      });
      expect(applicantRepo.create).toHaveBeenCalledWith({
        email: 'new@example.com',
        name: 'Alice Smith',
        major: 'Computer Science',
        academicYear: AcademicYear.FIRST,
        graduationYear: null,
      });
      expect(applicantRepo.save).toHaveBeenCalled();
    });

    it('returns existing applicant without creating', async () => {
      const mockExisting: Applicant = {
        id: 5,
        email: 'existing@example.com',
        name: 'Bob Jones',
        major: 'Engineering',
        academicYear: AcademicYear.SECOND,
        graduationYear: 2025,
        createdAt: new Date(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        application: undefined as any,
      };
      applicantRepo.findOne.mockResolvedValue(mockExisting);

      const result = await service.findOrCreate({
        email: 'existing@example.com',
        name: 'Bob Jones',
        major: 'Engineering',
        year: FormYear.SECOND,
      });

      expect(result.created).toBe(false);
      expect(result.applicant).toEqual(mockExisting);
      expect(applicantRepo.findOne).toHaveBeenCalledWith({
        where: { email: 'existing@example.com' },
      });
      expect(applicantRepo.create).not.toHaveBeenCalled();
      expect(applicantRepo.save).not.toHaveBeenCalled();
    });

    it('maps FormYear.FIFTH_PLUS to AcademicYear.FIFTH', async () => {
      applicantRepo.findOne.mockResolvedValue(null);
      const mockCreated: Applicant = {
        id: 2,
        email: 'fifth@example.com',
        name: 'Carol White',
        major: 'Physics',
        academicYear: AcademicYear.FIFTH,
        graduationYear: null,
        createdAt: new Date(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        application: undefined as any,
      };
      applicantRepo.save.mockResolvedValue(mockCreated);

      await service.findOrCreate({
        email: 'fifth@example.com',
        name: 'Carol White',
        major: 'Physics',
        year: FormYear.FIFTH_PLUS,
      });

      expect(applicantRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          academicYear: AcademicYear.FIFTH,
        }),
      );
    });

    it('sets graduationYear to null for new applicants', async () => {
      applicantRepo.findOne.mockResolvedValue(null);
      applicantRepo.save.mockResolvedValue({} as unknown as Applicant);

      await service.findOrCreate({
        email: 'test@example.com',
        name: 'Test User',
        major: 'Math',
        year: FormYear.THIRD,
      });

      expect(applicantRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          graduationYear: null,
        }),
      );
    });

    it('maps all FormYear values correctly', async () => {
      applicantRepo.findOne.mockResolvedValue(null);
      applicantRepo.save.mockResolvedValue({} as unknown as Applicant);

      const testCases = [
        [FormYear.FIRST, AcademicYear.FIRST],
        [FormYear.SECOND, AcademicYear.SECOND],
        [FormYear.THIRD, AcademicYear.THIRD],
        [FormYear.FOURTH, AcademicYear.FOURTH],
        [FormYear.FIFTH_PLUS, AcademicYear.FIFTH],
      ];

      for (const [formYear, expectedAcademicYear] of testCases) {
        applicantRepo.create.mockClear();
        applicantRepo.save.mockClear();

        await service.findOrCreate({
          email: `test${formYear}@example.com`,
          name: 'Test User',
          major: 'Test Major',
          year: formYear as FormYear,
        });

        expect(applicantRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            academicYear: expectedAcademicYear,
          }),
        );
      }
    });
  });
});
