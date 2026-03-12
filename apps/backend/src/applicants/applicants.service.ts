import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Applicant } from './entities/applicant.entity';
import { AcademicYear } from './enums/academic-year.enum';
import { FormYear } from '../raw-google-forms/enums/form-year.enum';

export interface FindOrCreateApplicantDto {
  email: string;
  name: string;
  major: string;
  year: FormYear;
}

@Injectable()
export class ApplicantsService {
  private readonly logger = new Logger(ApplicantsService.name);

  constructor(
    @InjectRepository(Applicant)
    private readonly applicantRepository: Repository<Applicant>,
  ) {}

  /**
   * Map FormYear to AcademicYear
   */
  private mapFormYearToAcademicYear(formYear: FormYear): AcademicYear {
    switch (formYear) {
      case FormYear.FIRST:
        return AcademicYear.FIRST;
      case FormYear.SECOND:
        return AcademicYear.SECOND;
      case FormYear.THIRD:
        return AcademicYear.THIRD;
      case FormYear.FOURTH:
        return AcademicYear.FOURTH;
      case FormYear.FIFTH_PLUS:
        return AcademicYear.FIFTH;
      default:
        throw new Error(`Unknown FormYear: ${formYear}`);
    }
  }

  /**
   * Find or create an applicant by email.
   * Returns the applicant and a flag indicating if it was newly created.
   */
  async findOrCreate(
    dto: FindOrCreateApplicantDto,
  ): Promise<{ applicant: Applicant; created: boolean }> {
    const existing = await this.applicantRepository.findOne({
      where: { email: dto.email },
    });

    if (existing) {
      this.logger.warn(
        `Applicant already existed for email: ${dto.email}, skipping creation`,
      );
      return { applicant: existing, created: false };
    }

    const applicant = this.applicantRepository.create({
      email: dto.email,
      name: dto.name,
      major: dto.major,
      academicYear: this.mapFormYearToAcademicYear(dto.year),
    });

    const savedApplicant = await this.applicantRepository.save(applicant);
    this.logger.log(`Created new applicant: ${dto.email}`);
    return { applicant: savedApplicant, created: true };
  }
}
