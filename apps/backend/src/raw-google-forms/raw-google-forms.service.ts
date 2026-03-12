import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RawGoogleForm } from './entities/raw-google-form.entity';
import { SubmitGoogleFormDto } from './dto/submit-google-form.dto';
import { S3Service } from '../util/s3/s3.service';
import { ApplicantsService } from '../applicants/applicants.service';
import { ApplicationsService } from '../applications/applications.service';

@Injectable()
export class RawGoogleFormsService {
  private readonly logger = new Logger(RawGoogleFormsService.name);

  constructor(
    @InjectRepository(RawGoogleForm)
    private readonly rawGoogleFormRepo: Repository<RawGoogleForm>,
    private readonly s3Service: S3Service,
    private readonly applicantsService: ApplicantsService,
    private readonly applicationsService: ApplicationsService,
  ) {}

  async uploadResume(file: Express.Multer.File): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const uuid = crypto.randomUUID();
    const key = `resumes/${uuid}-${file.originalname}`;
    const url = await this.s3Service.uploadResume(
      key,
      file.buffer,
      file.mimetype,
    );

    return { url };
  }

  async submitGoogleForm(dto: SubmitGoogleFormDto) {
    try {
      // Check for existing submission with this email
      const existingForm = await this.rawGoogleFormRepo.findOne({
        where: { email: dto.email },
      });

      if (existingForm) {
        this.logger.warn(
          `Duplicate Google Form submission for email: ${dto.email}`,
        );
        throw new BadRequestException(
          'A form submission already exists for this email address',
        );
      }

      // Save raw Google Form data
      const rawForm = this.rawGoogleFormRepo.create({
        email: dto.email,
        fullName: dto.fullName,
        year: dto.year,
        college: dto.college,
        major: dto.major,
        codingExperience: dto.codingExperience,
        codingExperienceOther: dto.codingExperienceOther || null,
        resumeUrl: dto.resumeUrl,
        whyC4C: dto.whyC4C,
        selfStartedProject: dto.selfStartedProject || null,
        communityImpact: dto.communityImpact || null,
        teamConflict: dto.teamConflict || null,
        otherExperiences: dto.otherExperiences || null,
        heardAboutC4C: dto.heardAboutC4C,
        heardAboutC4COther: dto.heardAboutC4COther || null,
        appliedBefore:
          dto.appliedBefore === 'yes' || dto.appliedBefore === 'true',
        fallCommitments: dto.fallCommitments,
        questionsOrConcerns: dto.questionsOrConcerns || null,
      });
      const savedForm = await this.rawGoogleFormRepo.save(rawForm);

      this.logger.log(
        `Google Form submission received from email: ${dto.email}`,
      );

      // Create or find applicant
      const { applicant, created: applicantCreated } =
        await this.applicantsService.findOrCreate({
          email: dto.email,
          name: dto.fullName,
          major: dto.major,
          year: dto.year,
        });

      if (!applicantCreated) {
        this.logger.warn(
          `Applicant already existed for email: ${dto.email}, continuing with existing applicant`,
        );
      }

      // Create or find application
      const { application: _application, created: appCreated } =
        await this.applicationsService.findOrCreate(applicant, savedForm);

      if (!appCreated) {
        this.logger.warn(
          `Application already existed for applicant: ${dto.email}, continuing with existing application`,
        );
      }

      return {
        id: savedForm.id,
        message: 'Form submitted successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to submit Google Form for email ${dto.email}: ${error.message}`,
      );
      throw error;
    }
  }
}
