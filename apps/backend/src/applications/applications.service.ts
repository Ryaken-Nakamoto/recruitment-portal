import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application } from './entities/application.entity';
import { Applicant } from '../applicants/entities/applicant.entity';
import { RawGoogleForm } from '../raw-google-forms/entities/raw-google-form.entity';
import {
  ApplicationListItemDto,
  ApplicationsListResponseDto,
} from './dto/application-list-item.dto';

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
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
}
