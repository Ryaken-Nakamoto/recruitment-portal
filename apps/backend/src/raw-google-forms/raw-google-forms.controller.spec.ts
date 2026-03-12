import { Test, TestingModule } from '@nestjs/testing';
import { RawGoogleFormsController } from './raw-google-forms.controller';
import { RawGoogleFormsService } from './raw-google-forms.service';
import { SubmitGoogleFormDto } from './dto/submit-google-form.dto';
import { FormYear } from './enums/form-year.enum';
import { College } from './enums/college.enum';
import { CodingExperience } from './enums/coding-experience.enum';
import { HearAboutC4C } from './enums/hear-about-c4c.enum';
import { BadRequestException } from '@nestjs/common';

describe('RawGoogleFormsController', () => {
  let controller: RawGoogleFormsController;
  let service: jest.Mocked<RawGoogleFormsService>;

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
    const mockService = {
      submitGoogleForm: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RawGoogleFormsController],
      providers: [
        {
          provide: RawGoogleFormsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<RawGoogleFormsController>(RawGoogleFormsController);
    service = module.get(
      RawGoogleFormsService,
    ) as jest.Mocked<RawGoogleFormsService>;
  });

  describe('POST /submit', () => {
    it('should call submitGoogleForm and return result', async () => {
      const expected = {
        id: 1,
        message: 'Form submitted successfully',
      };
      service.submitGoogleForm.mockResolvedValue(expected);

      const result = await controller.submitForm(mockDto);

      expect(result).toEqual(expected);
      expect(service.submitGoogleForm).toHaveBeenCalledWith(mockDto);
    });

    it('should throw BadRequestException on duplicate email', async () => {
      service.submitGoogleForm.mockRejectedValue(
        new BadRequestException(
          'A form submission already exists for this email address',
        ),
      );

      await expect(controller.submitForm(mockDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(service.submitGoogleForm).toHaveBeenCalledWith(mockDto);
    });
  });
});
