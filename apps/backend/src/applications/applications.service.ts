import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Readable } from 'stream';
import { Application } from './entities/application.entity';
import { Applicant } from '../applicants/entities/applicant.entity';
import { RawGoogleForm } from '../raw-google-forms/entities/raw-google-form.entity';
import {
  ApplicationListItemDto,
  ApplicationsListResponseDto,
} from './dto/application-list-item.dto';
import { ApplicationDetailDto } from './dto/application-detail.dto';
import { S3Service } from '../util/s3/s3.service';

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * Find or create an application for the given applicant.
   * Returns the application and a flag indicating if it was newly created.
   */
  async findOrCreate(
    applicant: Applicant,
    rawForm: RawGoogleForm,
  ): Promise<{ application: Application; created: boolean }> {
    const existing = await this.applicationRepository.findOne({
      where: { applicant: { id: applicant.id } },
    });

    if (existing) {
      this.logger.warn(
        `Application already existed for applicant: ${applicant.email}`,
      );
      return { application: existing, created: false };
    }

    const application = this.applicationRepository.create({
      applicant,
      rawGoogleForm: rawForm,
    });

    const savedApplication = await this.applicationRepository.save(application);
    this.logger.log(
      `Created new application for applicant: ${applicant.email}`,
    );
    return { application: savedApplication, created: true };
  }

  async findOneDetail(id: number): Promise<ApplicationDetailDto> {
    const application = await this.applicationRepository.findOne({
      where: { id },
      relations: ['applicant', 'rawGoogleForm'],
    });

    if (!application) {
      throw new NotFoundException(`Application with id ${id} not found`);
    }

    const applicant = application.applicant as Applicant;
    const rawForm = application.rawGoogleForm as RawGoogleForm;

    this.logger.log(`Retrieved application detail for id ${id}`);

    return {
      id: application.id,
      round: application.round,
      roundStatus: application.roundStatus,
      finalDecision: application.finalDecision,
      submittedAt: application.submittedAt,
      applicant: {
        id: applicant.id,
        name: applicant.name,
        email: applicant.email,
        academicYear: applicant.academicYear,
        major: applicant.major,
      },
      rawGoogleForm: {
        id: rawForm.id,
        email: rawForm.email,
        fullName: rawForm.fullName,
        year: rawForm.year,
        college: rawForm.college,
        major: rawForm.major,
        codingExperience: rawForm.codingExperience,
        codingExperienceOther: rawForm.codingExperienceOther,
        whyC4C: rawForm.whyC4C,
        selfStartedProject: rawForm.selfStartedProject,
        communityImpact: rawForm.communityImpact,
        teamConflict: rawForm.teamConflict,
        otherExperiences: rawForm.otherExperiences,
        heardAboutC4C: rawForm.heardAboutC4C,
        heardAboutC4COther: rawForm.heardAboutC4COther,
        appliedBefore: rawForm.appliedBefore,
        fallCommitments: rawForm.fallCommitments,
        questionsOrConcerns: rawForm.questionsOrConcerns,
        submittedAt: rawForm.submittedAt,
      },
    };
  }

  async listAll(
    page: number,
    limit: number,
  ): Promise<ApplicationsListResponseDto> {
    const skip = (page - 1) * limit;
    const [applications, total] = await this.applicationRepository.findAndCount(
      {
        relations: ['applicant'],
        skip,
        take: limit,
        order: { submittedAt: 'DESC' },
      },
    );

    const totalPages = Math.ceil(total / limit);

    const data: ApplicationListItemDto[] = applications.map((a) => ({
      id: a.id,
      round: a.round,
      roundStatus: a.roundStatus,
      finalDecision: a.finalDecision,
      submittedAt: a.submittedAt,
      applicant: {
        id: (a.applicant as Applicant).id,
        name: (a.applicant as Applicant).name,
        email: (a.applicant as Applicant).email,
        major: (a.applicant as Applicant).major,
        academicYear: (a.applicant as Applicant).academicYear,
      },
    }));

    this.logger.log(
      `Listed ${applications.length} applications for page ${page}`,
    );

    return {
      data,
      total,
      page,
      totalPages,
    };
  }

  async getResumeStream(
    id: number,
  ): Promise<{ stream: Readable; filename: string }> {
    const application = await this.applicationRepository.findOne({
      where: { id },
      relations: ['rawGoogleForm'],
    });

    if (!application) {
      throw new NotFoundException(`Application with id ${id} not found`);
    }

    const rawForm = application.rawGoogleForm as RawGoogleForm;
    const key = decodeURIComponent(
      new URL(rawForm.resumeUrl).pathname.slice(1),
    );
    const rawFilename = key.split('/').pop() ?? 'resume.pdf';
    // Strip the UUID prefix (format: "uuid-originalname")
    const filename =
      rawFilename.replace(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/,
        '',
      ) || rawFilename;
    const stream = await this.s3Service.getResume(key);
    return { stream, filename };
  }
}
