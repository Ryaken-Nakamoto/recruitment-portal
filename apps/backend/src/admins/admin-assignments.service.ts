import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { Application } from '../applications/entities/application.entity';
import { Assignment } from '../applications/entities/assignment.entity';
import { ScreeningReview } from '../applications/entities/screening-review.entity';
import { ScreeningReviewScore } from '../applications/entities/screening-review-score.entity';
import { ScreeningCriteria } from '../rubrics/entities/screening-criteria.entity';
import { ApplicationRound } from '../applications/enums/application-round.enum';
import { RoundStatus } from '../applications/enums/round-status.enum';
import { ScreeningReviewStatus } from '../applications/enums/screening-review-status.enum';
import { Applicant } from '../applicants/entities/applicant.entity';
import { Recruiter } from '../recruiters/entities/recruiter.entity';
import { AccountStatus } from '../users/status';

@Injectable()
export class AdminAssignmentsService {
  private readonly logger = new Logger(AdminAssignmentsService.name);

  constructor(
    @InjectRepository(Application)
    private readonly applicationRepo: Repository<Application>,
    @InjectRepository(Assignment)
    private readonly assignmentRepo: Repository<Assignment>,
    @InjectRepository(Recruiter)
    private readonly recruiterRepo: Repository<Recruiter>,
    @InjectRepository(ScreeningReview)
    private readonly screeningReviewRepo: Repository<ScreeningReview>,
  ) {}

  async listApplicationsByRound(round?: ApplicationRound) {
    const where = round
      ? { round, roundStatus: RoundStatus.PENDING }
      : { roundStatus: RoundStatus.PENDING };
    const apps = await this.applicationRepo.find({
      where,
      relations: ['applicant'],
    });
    this.logger.log(
      `Listed ${apps.length} PENDING applications${
        round ? ` for round ${round}` : ''
      }`,
    );
    return apps.map((a) => ({
      id: a.id,
      round: a.round,
      roundStatus: a.roundStatus,
      applicant: {
        name: (a.applicant as Applicant).name,
      },
    }));
  }

  async listActiveRecruiters() {
    const recruiters = await this.recruiterRepo.findBy({
      accountStatus: AccountStatus.ACTIVATED,
    });
    this.logger.log(`Listed ${recruiters.length} active recruiters`);
    return recruiters.map((r) => ({
      id: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
    }));
  }

  async assignRecruiters(
    pairs: { appId: number; recruiterIds: number[] }[],
  ): Promise<{
    assigned: number;
    skippedApps: { appId: number; existingRecruiters: string[] }[];
  }> {
    if (pairs.length === 0) {
      throw new BadRequestException('pairs must not be empty');
    }

    // Extract all unique app and recruiter IDs
    const allAppIds = [...new Set(pairs.map((p) => p.appId))];
    const allRecruiterIds = [...new Set(pairs.flatMap((p) => p.recruiterIds))];

    // Fetch and validate all recruiters
    const recruiters = await this.recruiterRepo.findBy({
      id: In(allRecruiterIds),
    });
    if (recruiters.length !== allRecruiterIds.length) {
      throw new NotFoundException('One or more recruiter IDs not found');
    }
    const recruiterMap = new Map(recruiters.map((r) => [r.id, r]));

    // Fetch and validate all applications
    const applications = await this.applicationRepo.findBy({
      id: In(allAppIds),
    });
    if (applications.length !== allAppIds.length) {
      throw new NotFoundException('One or more application IDs not found');
    }

    // Hard deny: reject if any selected app is not in PENDING status
    const blockedIds = applications
      .filter((a) => a.roundStatus !== RoundStatus.PENDING)
      .map((a) => a.id);
    if (blockedIds.length > 0) {
      throw new BadRequestException({
        message:
          'Cannot bulk-assign reviewers: all selected applications must be in PENDING status.',
        blockedAppIds: blockedIds,
      });
    }

    const appMap = new Map(applications.map((a) => [a.id, a]));

    // Load existing assignments to skip duplicates within the same round
    const existingAssignments = await this.assignmentRepo.find({
      where: { application: { id: In(allAppIds) } },
      relations: ['recruiter', 'application'],
    });
    const existingPairs = new Set(
      existingAssignments.map(
        (a) =>
          `${(a.application as Application).id}:${
            (a.recruiter as Recruiter).id
          }:${a.round}`,
      ),
    );

    // Build map appId → existing recruiter names
    const existingRecruitersByApp = new Map<number, string[]>();
    for (const a of existingAssignments) {
      const appId = (a.application as Application).id;
      const r = a.recruiter as Recruiter;
      const entry = existingRecruitersByApp.get(appId) ?? [];
      entry.push(`${r.firstName} ${r.lastName}`);
      existingRecruitersByApp.set(appId, entry);
    }

    // Process each pair and create assignments
    let assigned = 0;
    const appsWithNewAssignments = new Set<number>();
    const skippedAppMap = new Map<number, string[]>();

    for (const pair of pairs) {
      const app = appMap.get(pair.appId)!;
      for (const recruiterId of pair.recruiterIds) {
        const recruiter = recruiterMap.get(recruiterId)!;
        const key = `${app.id}:${recruiter.id}:${app.round}`;
        if (existingPairs.has(key)) {
          skippedAppMap.set(app.id, existingRecruitersByApp.get(app.id) ?? []);
          continue;
        }

        const assignment = this.assignmentRepo.create({
          recruiter,
          application: app,
          round: app.round,
        });
        await this.assignmentRepo.save(assignment);
        appsWithNewAssignments.add(app.id);
        assigned++;
      }
    }

    // For apps that received new assignments, transition PENDING → IN_PROGRESS
    const appsToUpdate = applications.filter(
      (a) =>
        appsWithNewAssignments.has(a.id) &&
        a.roundStatus === RoundStatus.PENDING,
    );
    if (appsToUpdate.length > 0) {
      await this.applicationRepo.update(
        { id: In(appsToUpdate.map((a) => a.id)) },
        { roundStatus: RoundStatus.IN_PROGRESS },
      );
    }

    this.logger.log(
      `Added ${assigned} new assignments across ${pairs.length} pairs (${skippedAppMap.size} apps had duplicates skipped)`,
    );
    return {
      assigned,
      skippedApps: Array.from(skippedAppMap.entries()).map(
        ([appId, existingRecruiters]) => ({ appId, existingRecruiters }),
      ),
    };
  }

  async getApplicationReviews(applicationId: number) {
    const application = await this.applicationRepo.findOne({
      where: { id: applicationId },
    });
    if (!application) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }

    // Only return assignments for the current round
    const assignments = await this.assignmentRepo.find({
      where: {
        application: { id: applicationId },
        round: application.round as unknown as ApplicationRound,
      },
      relations: ['recruiter'],
    });

    if (assignments.length === 0) {
      return [];
    }

    const assignmentIds = assignments.map((a) => a.id);
    const reviews = await this.screeningReviewRepo.find({
      where: { assignment: { id: In(assignmentIds) } },
      relations: ['assignment', 'scores', 'scores.criteria'],
    });

    const reviewByAssignmentId = new Map(
      reviews.map((r) => [(r.assignment as Assignment).id, r]),
    );

    return assignments.map((a) => {
      const recruiter = a.recruiter as Recruiter;
      const review = reviewByAssignmentId.get(a.id);
      const recruiterName = `${recruiter.firstName} ${recruiter.lastName}`;

      if (!review) {
        return {
          assignmentId: a.id,
          recruiterName,
          reviewStatus: 'not_started' as const,
          notes: a.notes,
          rubricCriteria: [],
        };
      }

      const scores = review.scores as ScreeningReviewScore[];
      const reviewStatus =
        review.status === ScreeningReviewStatus.SUBMITTED
          ? ('submitted' as const)
          : ('draft' as const);
      return {
        assignmentId: a.id,
        recruiterName,
        reviewStatus,
        notes: a.notes,
        rubricCriteria: scores.map((s) => {
          const criteria = s.criteria as ScreeningCriteria;
          return {
            id: criteria.id,
            name: criteria.name,
            oneDescription: criteria.oneDescription,
            twoDescription: criteria.twoDescription,
            threeDescription: criteria.threeDescription,
            score: s.score,
          };
        }),
      };
    });
  }

  async getApplicationAssignments(applicationId: number) {
    const application = await this.applicationRepo.findOne({
      where: { id: applicationId },
    });
    if (!application) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }

    // Only return assignments for the current round
    const assignments = await this.assignmentRepo.find({
      where: {
        application: { id: applicationId },
        round: application.round as unknown as ApplicationRound,
      },
      relations: ['recruiter'],
    });

    const assignmentIds = assignments.map((a) => a.id);
    const reviews =
      assignmentIds.length > 0
        ? await this.screeningReviewRepo.find({
            where: { assignment: { id: In(assignmentIds) } },
            relations: ['assignment'],
          })
        : [];
    const submittedIds = new Set(
      reviews
        .filter((r) => r.status === ScreeningReviewStatus.SUBMITTED)
        .map((r) => (r.assignment as Assignment).id),
    );
    const draftIds = new Set(
      reviews
        .filter((r) => r.status === ScreeningReviewStatus.DRAFT)
        .map((r) => (r.assignment as Assignment).id),
    );

    return assignments.map((a) => ({
      assignmentId: a.id,
      recruiterId: (a.recruiter as Recruiter).id,
      recruiterName: `${(a.recruiter as Recruiter).firstName} ${
        (a.recruiter as Recruiter).lastName
      }`,
      reviewStatus: submittedIds.has(a.id)
        ? 'submitted'
        : draftIds.has(a.id)
        ? 'draft'
        : 'not_started',
    }));
  }

  async addReviewer(applicationId: number, recruiterId: number) {
    const application = await this.applicationRepo.findOne({
      where: { id: applicationId },
      relations: ['applicant'],
    });
    if (!application) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }

    if (
      application.roundStatus === RoundStatus.PENDING_EMAIL ||
      application.roundStatus === RoundStatus.EMAIL_SENT
    ) {
      throw new BadRequestException(
        'Cannot add reviewer: the recruitment window for this application has closed.',
      );
    }

    const recruiter = await this.recruiterRepo.findOne({
      where: { id: recruiterId },
    });
    if (!recruiter) {
      throw new NotFoundException(`Recruiter ${recruiterId} not found`);
    }

    // Conflict check is scoped to the current round
    const existing = await this.assignmentRepo.findOne({
      where: {
        application: { id: applicationId },
        recruiter: { id: recruiterId },
        round: application.round as unknown as ApplicationRound,
      },
    });
    if (existing) {
      throw new ConflictException(
        'Recruiter is already assigned to this application',
      );
    }

    const assignment = this.assignmentRepo.create({
      recruiter,
      application,
      round: application.round,
    });
    const saved = await this.assignmentRepo.save(assignment);

    if (
      application.roundStatus === RoundStatus.PENDING ||
      application.roundStatus === RoundStatus.AWAITING_ADMIN
    ) {
      application.roundStatus = RoundStatus.IN_PROGRESS;
      await this.applicationRepo.save(application);
      this.logger.log(
        `Application ${applicationId} transitioned to IN_PROGRESS after adding recruiter ${recruiterId}`,
      );
    }

    this.logger.log(
      `Added recruiter ${recruiterId} to application ${applicationId}, assignment id ${saved.id}`,
    );

    return {
      assignmentId: saved.id,
      recruiterId: recruiter.id,
      recruiterName: `${recruiter.firstName} ${recruiter.lastName}`,
      roundStatus: application.roundStatus,
    };
  }

  async removeReviewer(assignmentId: number, force = false) {
    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId },
      relations: ['recruiter', 'application'],
    });
    if (!assignment) {
      throw new NotFoundException(`Assignment ${assignmentId} not found`);
    }

    const recruiter = assignment.recruiter as Recruiter;
    const app = assignment.application as Application;

    if (
      app.roundStatus === RoundStatus.PENDING_EMAIL ||
      app.roundStatus === RoundStatus.EMAIL_SENT
    ) {
      throw new BadRequestException(
        'Cannot remove reviewer: the recruitment window for this application has closed.',
      );
    }

    // Block removal of retired assignments (from a previous round or terminal decision with email sent)
    if (
      assignment.round !== app.round ||
      (app.finalDecision !== null &&
        (app.roundStatus as unknown as RoundStatus) === RoundStatus.EMAIL_SENT)
    ) {
      throw new BadRequestException(
        'Cannot remove a retired assignment from a previous round.',
      );
    }

    const review = await this.screeningReviewRepo.findOne({
      where: { assignment: { id: assignmentId } },
    });

    if (review && !force) {
      return {
        conflict: true,
        hasReview: true,
        recruiterName: `${recruiter.firstName} ${recruiter.lastName}`,
      };
    }

    await this.assignmentRepo.delete({ id: assignmentId });
    this.logger.log(
      `Removed assignment ${assignmentId} (recruiter ${recruiter.id}) from application ${app.id}`,
    );

    // Re-check completion status using only current-round assignments
    const remaining = await this.assignmentRepo.find({
      where: {
        application: { id: app.id },
        round: app.round as unknown as ApplicationRound,
      },
    });

    let newStatus: RoundStatus;
    if (remaining.length === 0) {
      newStatus = RoundStatus.PENDING;
    } else {
      const reviewedCount = await this.screeningReviewRepo.count({
        where: {
          assignment: { id: In(remaining.map((a) => a.id)) },
          status: ScreeningReviewStatus.SUBMITTED,
        },
      });
      newStatus =
        reviewedCount === remaining.length
          ? RoundStatus.AWAITING_ADMIN
          : RoundStatus.IN_PROGRESS;
    }

    await this.applicationRepo.update(
      { id: app.id },
      { roundStatus: newStatus },
    );
    this.logger.log(
      `Application ${app.id} roundStatus updated to ${newStatus}`,
    );

    return { conflict: false, roundStatus: newStatus };
  }

  async getAssignmentHistory(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [assignments, total] = await this.assignmentRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.application', 'app')
      .leftJoinAndSelect('app.applicant', 'applicant')
      .leftJoinAndSelect('a.recruiter', 'recruiter')
      .where(
        '(a.round != app.round OR (app.finalDecision IS NOT NULL AND app.roundStatus = :emailSent))',
      )
      .setParameter('emailSent', RoundStatus.EMAIL_SENT)
      .orderBy('a.assignedAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const assignmentIds = assignments.map((a) => a.id);
    const reviews =
      assignmentIds.length > 0
        ? await this.screeningReviewRepo.find({
            where: { assignment: { id: In(assignmentIds) } },
            relations: ['assignment'],
          })
        : [];
    const reviewedIds = new Set(
      reviews.map((r) => (r.assignment as Assignment).id),
    );

    const data = assignments.map((a) => {
      const app = a.application as Application;
      const applicant = app.applicant as Applicant;
      const recruiter = a.recruiter as Recruiter;
      return {
        id: a.id,
        applicantName: applicant.name,
        applicationId: app.id,
        round: a.round,
        recruiterName: `${recruiter.firstName} ${recruiter.lastName}`,
        assignedAt: a.assignedAt,
        reviewStatus: reviewedIds.has(a.id)
          ? ('submitted' as const)
          : ('not_started' as const),
      };
    });

    this.logger.log(`Listed ${data.length} retired assignments (page ${page})`);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getAssignmentHistoryDetail(assignmentId: number) {
    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId },
      relations: [
        'recruiter',
        'application',
        'application.applicant',
        'application.rawGoogleForm',
      ],
    });
    if (!assignment) {
      throw new NotFoundException(`Assignment ${assignmentId} not found`);
    }

    const recruiter = assignment.recruiter as Recruiter;
    const app = assignment.application as Application;
    const applicant = app.applicant as Applicant;
    const rawForm = app.rawGoogleForm as unknown as Record<string, unknown>;

    const review = await this.screeningReviewRepo.findOne({
      where: { assignment: { id: assignmentId } },
      relations: ['scores', 'scores.criteria'],
    });

    const rubricCriteria = review
      ? (review.scores as ScreeningReviewScore[]).map((s) => {
          const criteria = s.criteria as ScreeningCriteria;
          return {
            id: criteria.id,
            name: criteria.name,
            oneDescription: criteria.oneDescription,
            twoDescription: criteria.twoDescription,
            threeDescription: criteria.threeDescription,
            score: s.score,
          };
        })
      : [];

    this.logger.log(
      `Admin fetched assignment history detail for assignment ${assignmentId}`,
    );

    return {
      assignmentId: assignment.id,
      recruiterName: `${recruiter.firstName} ${recruiter.lastName}`,
      recruiterId: recruiter.id,
      assignedAt: assignment.assignedAt,
      notes: assignment.notes,
      round: assignment.round,
      reviewStatus: review ? ('submitted' as const) : ('not_started' as const),
      rubricCriteria,
      application: {
        id: app.id,
        round: app.round,
        roundStatus: app.roundStatus,
        applicant: {
          id: (applicant as unknown as { id: number }).id,
          name: applicant.name,
          email: applicant.email,
          major: applicant.major,
          academicYear: applicant.academicYear,
        },
        rawGoogleForm: rawForm,
      },
    };
  }
}
