import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Readable } from 'stream';
import { Application } from './entities/application.entity';
import { Assignment } from './entities/assignment.entity';
import { ScreeningReview } from './entities/screening-review.entity';
import { ScreeningReviewScore } from './entities/screening-review-score.entity';
import { Applicant } from '../applicants/entities/applicant.entity';
import { RawGoogleForm } from '../raw-google-forms/entities/raw-google-form.entity';
import {
  ApplicationListItemDto,
  ApplicationsListResponseDto,
} from './dto/application-list-item.dto';
import { ApplicationDetailDto } from './dto/application-detail.dto';
import { S3Service } from '../util/s3/s3.service';
import { RoundStatus } from './enums/round-status.enum';
import { ScreeningReviewStatus } from './enums/screening-review-status.enum';

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,
    @InjectRepository(ScreeningReview)
    private readonly screeningReviewRepository: Repository<ScreeningReview>,
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
    roundStatus?: RoundStatus,
    sortAvgScore?: 'asc' | 'desc',
  ): Promise<ApplicationsListResponseDto> {
    const skip = (page - 1) * limit;
    const where = roundStatus ? { roundStatus } : {};

    let applications: Application[];
    let total: number;

    if (sortAvgScore) {
      // TypeORM's getManyAndCount() with skip/take calls createOrderByCombinedWithSelectExpression
      // which cannot parse aggregate expressions like AVG(score.score) in orderBy.
      // Solution: use getRawMany() (no pagination subquery) to get sorted IDs, then slice and load.
      const sortedIdsQb = this.applicationRepository
        .createQueryBuilder('app')
        .select('app.id', 'id')
        .leftJoin(Assignment, 'asn', 'asn.application = app.id')
        .leftJoin(ScreeningReview, 'sr', 'sr.assignment = asn.id')
        .leftJoin(ScreeningReviewScore, 'score', 'score.review = sr.id')
        .groupBy('app.id')
        .orderBy(
          'AVG(score.score)',
          sortAvgScore === 'asc' ? 'ASC' : 'DESC',
          'NULLS LAST',
        );

      if (roundStatus) {
        sortedIdsQb.where('app.roundStatus = :roundStatus', { roundStatus });
      }

      const sortedRaw: { id: string }[] = await sortedIdsQb.getRawMany();
      total = sortedRaw.length;

      const pagedIds = sortedRaw
        .slice(skip, skip + limit)
        .map((r) => Number(r.id));

      if (pagedIds.length === 0) {
        applications = [];
      } else {
        const loaded = await this.applicationRepository.find({
          where: { id: In(pagedIds) },
          relations: ['applicant'],
        });
        const byId = new Map(loaded.map((a) => [a.id, a]));
        applications = pagedIds
          .map((id) => byId.get(id))
          .filter((a): a is Application => a !== undefined);
      }
    } else {
      [applications, total] = await this.applicationRepository.findAndCount({
        relations: ['applicant'],
        where,
        skip,
        take: limit,
        order: { submittedAt: 'DESC' },
      });
    }

    const totalPages = Math.ceil(total / limit);

    const appIds = applications.map((a) => a.id);
    const assignments =
      appIds.length > 0
        ? await this.assignmentRepository.find({
            where: { application: { id: In(appIds) } },
            relations: ['application'],
          })
        : [];

    const assignmentIds = assignments.map((a) => a.id);
    const submittedReviews =
      assignmentIds.length > 0
        ? await this.screeningReviewRepository.find({
            where: {
              assignment: { id: In(assignmentIds) },
              status: ScreeningReviewStatus.SUBMITTED,
            },
            relations: ['assignment', 'scores'],
          })
        : [];

    // Build maps: appId → total assignments, appId → submitted reviews
    const totalByApp = new Map<number, number>();
    const assignmentIdToAppId = new Map<number, number>();
    for (const a of assignments) {
      const appId = (a.application as Application).id;
      totalByApp.set(appId, (totalByApp.get(appId) ?? 0) + 1);
      assignmentIdToAppId.set(a.id, appId);
    }
    const submittedByApp = new Map<number, number>();
    const scoreSumByApp = new Map<number, number>();
    const scoreCountByApp = new Map<number, number>();
    for (const r of submittedReviews) {
      const assignmentId = (r.assignment as Assignment).id;
      const appId = assignmentIdToAppId.get(assignmentId);
      if (appId !== undefined) {
        submittedByApp.set(appId, (submittedByApp.get(appId) ?? 0) + 1);
        for (const s of r.scores as ScreeningReviewScore[]) {
          scoreSumByApp.set(appId, (scoreSumByApp.get(appId) ?? 0) + s.score);
          scoreCountByApp.set(appId, (scoreCountByApp.get(appId) ?? 0) + 1);
        }
      }
    }

    const data: ApplicationListItemDto[] = applications.map((a) => {
      const total = totalByApp.get(a.id) ?? 0;
      const submitted = submittedByApp.get(a.id) ?? 0;
      const scoreSum = scoreSumByApp.get(a.id) ?? 0;
      const averageScore =
        total > 0 && submitted === total
          ? Math.round((scoreSum / total) * 100) / 100
          : null;
      return {
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
        reviewsTotal: total,
        reviewsSubmitted: submitted,
        averageScore,
      };
    });

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
