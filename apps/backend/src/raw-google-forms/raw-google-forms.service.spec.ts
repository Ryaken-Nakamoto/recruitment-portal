import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { RawGoogleFormsService } from './raw-google-forms.service';
import { RawGoogleForm } from './entities/raw-google-form.entity';
import { SubmitGoogleFormDto } from './dto/submit-google-form.dto';
import { FormYear } from './enums/form-year.enum';
import { College } from './enums/college.enum';
import { CodingExperience } from './enums/coding-experience.enum';
import { HearAboutC4C } from './enums/hear-about-c4c.enum';
import { S3Service } from '../util/s3/s3.service';
import { ApplicantsService } from '../applicants/applicants.service';
import { Applicant } from '../applicants/entities/applicant.entity';
import { ApplicationsService } from '../applications/applications.service';
import { Application } from '../applications/entities/application.entity';

const mockS3Service = {
  uploadResume: jest.fn(),
};

const mockApplicantsService = {
  findOrCreate: jest.fn(),
};

const mockApplicationsService = {
  findOrCreate: jest.fn(),
};

describe('RawGoogleFormsService', () => {
  let service: RawGoogleFormsService;
  let mockRepository: jest.Mocked<Repository<RawGoogleForm>>;

  const mockDto: SubmitGoogleFormDto = {
    email: 'test@example.com',
    fullName: 'John Doe',
    year: FormYear.FOURTH,
    college: College.ENGINEERING,
    major: 'Computer Science',
    codingExperience: [CodingExperience.SOFTWARE_DEVELOPMENT],
    codingExperienceOther: null,
    resumeUrl: 'https://example.com/resume.pdf',
    whyC4C: 'I want to help the community',
    selfStartedProject: 'Built a web app',
    communityImpact: 'Taught students to code',
    teamConflict: 'I listened to the other person',
    otherExperiences: 'Interned at a startup',
    heardAboutC4C: [HearAboutC4C.WORD_OF_MOUTH],
    heardAboutC4COther: null,
    appliedBefore: 'no',
    fallCommitments: 'I can commit 10 hours per week',
    questionsOrConcerns: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockRepositoryValue = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    // Set default return values for the services
    mockApplicantsService.findOrCreate.mockResolvedValue({
      applicant: { id: 1 } as unknown as Applicant,
      created: true,
    });
    mockApplicationsService.findOrCreate.mockResolvedValue({
      application: { id: 1 } as unknown as Application,
      created: true,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RawGoogleFormsService,
        {
          provide: getRepositoryToken(RawGoogleForm),
          useValue: mockRepositoryValue,
        },
        { provide: S3Service, useValue: mockS3Service },
        { provide: ApplicantsService, useValue: mockApplicantsService },
        { provide: ApplicationsService, useValue: mockApplicationsService },
      ],
    }).compile();

    service = module.get<RawGoogleFormsService>(RawGoogleFormsService);
    mockRepository = mockRepositoryValue as unknown as jest.Mocked<
      Repository<RawGoogleForm>
    >;
  });

  describe('uploadResume', () => {
    it('should upload file to S3 and return URL', async () => {
      const mockFile = {
        originalname: 'resume.pdf',
        buffer: Buffer.from('pdf content'),
        mimetype: 'application/pdf',
      } as unknown as Express.Multer.File;

      const expectedUrl =
        'https://bucket-name.s3.us-east-1.amazonaws.com/resumes/uuid-resume.pdf';
      mockS3Service.uploadResume.mockResolvedValue(expectedUrl);

      const result = await service.uploadResume(mockFile);

      expect(result).toEqual({ url: expectedUrl });
      expect(mockS3Service.uploadResume).toHaveBeenCalledWith(
        expect.stringMatching(
          /^resumes\/[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}-resume\.pdf$/,
        ),
        mockFile.buffer,
        mockFile.mimetype,
      );
    });

    it('should throw BadRequestException when no file is provided', async () => {
      await expect(
        service.uploadResume(undefined as unknown as Express.Multer.File),
      ).rejects.toThrow(BadRequestException);
      expect(mockS3Service.uploadResume).not.toHaveBeenCalled();
    });
  });

  describe('submitGoogleForm', () => {
    it('should save form and return id when email is unique', async () => {
      const savedForm = {
        id: 1,
        email: 'test@example.com',
        fullName: 'John Doe',
        year: FormYear.FOURTH,
        college: College.ENGINEERING,
        major: 'Computer Science',
        codingExperience: [CodingExperience.SOFTWARE_DEVELOPMENT],
        codingExperienceOther: null,
        resumeUrl: 'https://example.com/resume.pdf',
        whyC4C: 'I want to help the community',
        selfStartedProject: 'Built a web app',
        communityImpact: 'Taught students to code',
        teamConflict: 'I listened to the other person',
        otherExperiences: 'Interned at a startup',
        heardAboutC4C: [HearAboutC4C.WORD_OF_MOUTH],
        heardAboutC4COther: null,
        appliedBefore: 'no',
        fallCommitments: 'I can commit 10 hours per week',
        questionsOrConcerns: null,
        submittedAt: new Date(),
      } as unknown as RawGoogleForm;

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(savedForm);
      mockRepository.save.mockResolvedValue(savedForm);

      const result = await service.submitGoogleForm(mockDto);

      expect(result).toEqual({
        id: 1,
        message: 'Form submitted successfully',
      });
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException when email already exists', async () => {
      const existingForm = {
        id: 1,
        email: 'test@example.com',
        fullName: 'John Doe',
        year: FormYear.FOURTH,
        college: College.ENGINEERING,
        major: 'Computer Science',
        codingExperience: [CodingExperience.SOFTWARE_DEVELOPMENT],
        codingExperienceOther: null,
        resumeUrl: 'https://example.com/resume.pdf',
        whyC4C: 'I want to help the community',
        selfStartedProject: null,
        communityImpact: null,
        teamConflict: null,
        otherExperiences: null,
        heardAboutC4C: [HearAboutC4C.WORD_OF_MOUTH],
        heardAboutC4COther: null,
        appliedBefore: 'no',
        fallCommitments: 'I can commit 10 hours per week',
        questionsOrConcerns: null,
        submittedAt: new Date(),
      } as unknown as RawGoogleForm;

      mockRepository.findOne.mockResolvedValue(existingForm);

      await expect(service.submitGoogleForm(mockDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should handle optional fields as null', async () => {
      const dtoWithoutOptionals: SubmitGoogleFormDto = {
        ...mockDto,
        codingExperienceOther: undefined,
        selfStartedProject: undefined,
        questionsOrConcerns: undefined,
      };

      const savedForm: RawGoogleForm = {
        id: 2,
        email: 'test@example.com',
        fullName: 'John Doe',
        year: FormYear.FOURTH,
        college: College.ENGINEERING,
        major: 'Computer Science',
        codingExperience: [CodingExperience.SOFTWARE_DEVELOPMENT],
        codingExperienceOther: null,
        resumeUrl: 'https://example.com/resume.pdf',
        whyC4C: 'I want to help the community',
        selfStartedProject: null,
        communityImpact: 'Taught students to code',
        teamConflict: 'I listened to the other person',
        otherExperiences: 'Interned at a startup',
        heardAboutC4C: [HearAboutC4C.WORD_OF_MOUTH],
        heardAboutC4COther: null,
        appliedBefore: 'no',
        fallCommitments: 'I can commit 10 hours per week',
        questionsOrConcerns: null,
        submittedAt: new Date(),
      } as unknown as RawGoogleForm;

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(savedForm);
      mockRepository.save.mockResolvedValue(savedForm);

      await service.submitGoogleForm(dtoWithoutOptionals);

      const createdObj = mockRepository.create.mock.calls[0][0];
      expect(createdObj.codingExperienceOther).toBeNull();
      expect(createdObj.selfStartedProject).toBeNull();
      expect(createdObj.questionsOrConcerns).toBeNull();
    });

    it('should store appliedBefore verbatim from the DTO', async () => {
      const savedForm: RawGoogleForm = {
        id: 3,
        email: 'test@example.com',
        fullName: 'John Doe',
        year: FormYear.FOURTH,
        college: College.ENGINEERING,
        major: 'Computer Science',
        codingExperience: [CodingExperience.SOFTWARE_DEVELOPMENT],
        codingExperienceOther: null,
        resumeUrl: 'https://example.com/resume.pdf',
        whyC4C: 'I want to help the community',
        selfStartedProject: 'Built a web app',
        communityImpact: 'Taught students to code',
        teamConflict: 'I listened to the other person',
        otherExperiences: 'Interned at a startup',
        heardAboutC4C: [HearAboutC4C.WORD_OF_MOUTH],
        heardAboutC4COther: null,
        appliedBefore: 'Yes',
        fallCommitments: 'I can commit 10 hours per week',
        questionsOrConcerns: null,
        submittedAt: new Date(),
      } as unknown as RawGoogleForm;

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(savedForm);
      mockRepository.save.mockResolvedValue(savedForm);

      const dtoYes = { ...mockDto, appliedBefore: 'Yes' };
      await service.submitGoogleForm(dtoYes);

      expect(mockRepository.create.mock.calls[0][0].appliedBefore).toBe('Yes');
    });

    it('calls ApplicantsService.findOrCreate and ApplicationsService.findOrCreate after saving the form', async () => {
      const savedForm: RawGoogleForm = {
        id: 1,
        email: 'test@example.com',
        fullName: 'John Doe',
        year: FormYear.FOURTH,
        college: College.ENGINEERING,
        major: 'Computer Science',
        codingExperience: [CodingExperience.SOFTWARE_DEVELOPMENT],
        codingExperienceOther: null,
        resumeUrl: 'https://example.com/resume.pdf',
        whyC4C: 'I want to help the community',
        selfStartedProject: 'Built a web app',
        communityImpact: 'Taught students to code',
        teamConflict: 'I listened to the other person',
        otherExperiences: 'Interned at a startup',
        heardAboutC4C: [HearAboutC4C.WORD_OF_MOUTH],
        heardAboutC4COther: null,
        appliedBefore: 'no',
        fallCommitments: 'I can commit 10 hours per week',
        questionsOrConcerns: null,
        submittedAt: new Date(),
      } as unknown as RawGoogleForm;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockApplicant = { id: 1, name: 'John Doe' } as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockApplication = { id: 1 } as any;

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(savedForm);
      mockRepository.save.mockResolvedValue(savedForm);
      mockApplicantsService.findOrCreate.mockResolvedValue({
        applicant: mockApplicant,
        created: true,
      });
      mockApplicationsService.findOrCreate.mockResolvedValue({
        application: mockApplication,
        created: true,
      });

      const result = await service.submitGoogleForm(mockDto);

      expect(result).toEqual({
        id: 1,
        message: 'Form submitted successfully',
      });
      expect(mockApplicantsService.findOrCreate).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'John Doe',
        major: 'Computer Science',
        year: FormYear.FOURTH,
      });
      expect(mockApplicationsService.findOrCreate).toHaveBeenCalledWith(
        mockApplicant,
        savedForm,
      );
    });

    it('continues when applicant already exists (duplicate)', async () => {
      const savedForm: RawGoogleForm = {
        id: 1,
        email: 'test@example.com',
        fullName: 'John Doe',
        year: FormYear.FOURTH,
        college: College.ENGINEERING,
        major: 'Computer Science',
        codingExperience: [CodingExperience.SOFTWARE_DEVELOPMENT],
        codingExperienceOther: null,
        resumeUrl: 'https://example.com/resume.pdf',
        whyC4C: 'I want to help the community',
        selfStartedProject: 'Built a web app',
        communityImpact: 'Taught students to code',
        teamConflict: 'I listened to the other person',
        otherExperiences: 'Interned at a startup',
        heardAboutC4C: [HearAboutC4C.WORD_OF_MOUTH],
        heardAboutC4COther: null,
        appliedBefore: 'no',
        fallCommitments: 'I can commit 10 hours per week',
        questionsOrConcerns: null,
        submittedAt: new Date(),
      } as unknown as RawGoogleForm;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockExistingApplicant = { id: 1, name: 'John Doe' } as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockApplication = { id: 1 } as any;

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(savedForm);
      mockRepository.save.mockResolvedValue(savedForm);
      mockApplicantsService.findOrCreate.mockResolvedValue({
        applicant: mockExistingApplicant,
        created: false,
      });
      mockApplicationsService.findOrCreate.mockResolvedValue({
        application: mockApplication,
        created: true,
      });

      const result = await service.submitGoogleForm(mockDto);

      expect(result).toEqual({
        id: 1,
        message: 'Form submitted successfully',
      });
      expect(mockApplicationsService.findOrCreate).toHaveBeenCalled();
    });

    it('continues when application already exists (duplicate)', async () => {
      const savedForm: RawGoogleForm = {
        id: 1,
        email: 'test@example.com',
        fullName: 'John Doe',
        year: FormYear.FOURTH,
        college: College.ENGINEERING,
        major: 'Computer Science',
        codingExperience: [CodingExperience.SOFTWARE_DEVELOPMENT],
        codingExperienceOther: null,
        resumeUrl: 'https://example.com/resume.pdf',
        whyC4C: 'I want to help the community',
        selfStartedProject: 'Built a web app',
        communityImpact: 'Taught students to code',
        teamConflict: 'I listened to the other person',
        otherExperiences: 'Interned at a startup',
        heardAboutC4C: [HearAboutC4C.WORD_OF_MOUTH],
        heardAboutC4COther: null,
        appliedBefore: 'no',
        fallCommitments: 'I can commit 10 hours per week',
        questionsOrConcerns: null,
        submittedAt: new Date(),
      } as unknown as RawGoogleForm;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockApplicant = { id: 1, name: 'John Doe' } as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockExistingApplication = { id: 5 } as any;

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(savedForm);
      mockRepository.save.mockResolvedValue(savedForm);
      mockApplicantsService.findOrCreate.mockResolvedValue({
        applicant: mockApplicant,
        created: true,
      });
      mockApplicationsService.findOrCreate.mockResolvedValue({
        application: mockExistingApplication,
        created: false,
      });

      const result = await service.submitGoogleForm(mockDto);

      expect(result).toEqual({
        id: 1,
        message: 'Form submitted successfully',
      });
    });

    it('should catch and rethrow errors from repository', async () => {
      const error = new Error('Database error');
      mockRepository.findOne.mockRejectedValue(error);

      await expect(service.submitGoogleForm(mockDto)).rejects.toThrow(error);
    });
  });
});
