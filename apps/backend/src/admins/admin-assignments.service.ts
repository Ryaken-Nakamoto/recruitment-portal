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
    @InjectRepository(ScreeningReviewScore)
    private readonly screeningReviewScoreRepo: Repository<ScreeningReviewScore>,
  ) {}

  async listApplicationsByRound(round?: ApplicationRound) {
    const where = round ? { round } : {};
    const apps = await this.applicationRepo.find({
      where,
      relations: ['applicant'],
    });
    this.logger.log(
      `Listed ${apps.length} applications${round ? ` for round ${round}` : ''}`,
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
    applicationIds: number[],
    recruiterIds: number[],
    recruitersPerApp: number,
  ): Promise<{ assigned: number; skippedAppIds: number[] }> {
    if (applicationIds.length === 0) {
      throw new BadRequestException('applicationIds must not be empty');
    }
    if (recruiterIds.length === 0) {
      throw new BadRequestException('recruiterIds must not be empty');
    }
    if (recruitersPerApp < 1) {
      throw new BadRequestException('recruitersPerApp must be at least 1');
    }
    if (recruitersPerApp > recruiterIds.length) {
      throw new BadRequestException('Not enough recruiters selected');
    }

    const recruiters = await this.recruiterRepo.findBy({
      id: In(recruiterIds),
    });
    if (recruiters.length !== recruiterIds.length) {
      throw new NotFoundException('One or more recruiter IDs not found');
    }

    const applications = await this.applicationRepo.findBy({
      id: In(applicationIds),
    });
    if (applications.length !== applicationIds.length) {
      throw new NotFoundException('One or more application IDs not found');
    }

    // Hard deny: reject if any selected app has a closed recruitment window
    const blockedIds = applications
      .filter(
        (a) =>
          a.roundStatus === RoundStatus.PENDING_EMAIL ||
          a.roundStatus === RoundStatus.EMAIL_SENT,
      )
      .map((a) => a.id);
    if (blockedIds.length > 0) {
      throw new BadRequestException({
        message:
          'Cannot assign reviewers: some applications have a closed recruitment window.',
        blockedAppIds: blockedIds,
      });
    }

    // Load existing assignments to skip duplicates
    const existingAssignments = await this.assignmentRepo.find({
      where: { application: { id: In(applicationIds) } },
      relations: ['recruiter', 'application'],
    });
    const existingPairs = new Set(
      existingAssignments.map(
        (a) =>
          `${(a.application as Application).id}:${
            (a.recruiter as Recruiter).id
          }`,
      ),
    );

    // Round-robin assignment — skip pairs that already exist
    const K = recruiters.length;
    let assigned = 0;
    const appsWithNewAssignments = new Set<number>();
    const skippedAppIds = new Set<number>();

    for (let i = 0; i < applications.length; i++) {
      for (let j = 0; j < recruitersPerApp; j++) {
        const recruiter = recruiters[(i * recruitersPerApp + j) % K];
        const key = `${applications[i].id}:${recruiter.id}`;
        if (existingPairs.has(key)) {
          skippedAppIds.add(applications[i].id);
          continue;
        }

        const assignment = this.assignmentRepo.create({
          recruiter,
          application: applications[i],
        });
        await this.assignmentRepo.save(assignment);
        appsWithNewAssignments.add(applications[i].id);
        assigned++;
      }
    }

    // For apps that received new assignments, reset PENDING/AWAITING_ADMIN → IN_PROGRESS
    const appsToUpdate = applications.filter(
      (a) =>
        appsWithNewAssignments.has(a.id) &&
        (a.roundStatus === RoundStatus.PENDING ||
          a.roundStatus === RoundStatus.AWAITING_ADMIN),
    );
    if (appsToUpdate.length > 0) {
      await this.applicationRepo.update(
        { id: In(appsToUpdate.map((a) => a.id)) },
        { roundStatus: RoundStatus.IN_PROGRESS },
      );
    }

    this.logger.log(
      `Added ${assigned} new assignments across ${applications.length} applications (${skippedAppIds.size} apps had duplicates skipped)`,
    );
    return { assigned, skippedAppIds: Array.from(skippedAppIds) };
  }

  async getApplicationReviews(applicationId: number) {
    const application = await this.applicationRepo.findOne({
      where: { id: applicationId },
    });
    if (!application) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }

    const assignments = await this.assignmentRepo.find({
      where: { application: { id: applicationId } },
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
      return {
        assignmentId: a.id,
        recruiterName,
        reviewStatus: 'submitted' as const,
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

    const assignments = await this.assignmentRepo.find({
      where: { application: { id: applicationId } },
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
    const reviewedIds = new Set(
      reviews.map((r) => (r.assignment as Assignment).id),
    );

    return assignments.map((a) => ({
      assignmentId: a.id,
      recruiterId: (a.recruiter as Recruiter).id,
      recruiterName: `${(a.recruiter as Recruiter).firstName} ${
        (a.recruiter as Recruiter).lastName
      }`,
      reviewStatus: reviewedIds.has(a.id) ? 'submitted' : 'not_started',
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

    const existing = await this.assignmentRepo.findOne({
      where: {
        application: { id: applicationId },
        recruiter: { id: recruiterId },
      },
    });
    if (existing) {
      throw new ConflictException(
        'Recruiter is already assigned to this application',
      );
    }

    const assignment = this.assignmentRepo.create({ recruiter, application });
    const saved = await this.assignmentRepo.save(assignment);

    if (application.roundStatus === RoundStatus.AWAITING_ADMIN) {
      application.roundStatus = RoundStatus.IN_PROGRESS;
      await this.applicationRepo.save(application);
      this.logger.log(
        `Application ${applicationId} reset to IN_PROGRESS after adding recruiter ${recruiterId}`,
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

    // Re-check completion status
    const remaining = await this.assignmentRepo.find({
      where: { application: { id: app.id } },
    });

    let newStatus: RoundStatus;
    if (remaining.length === 0) {
      newStatus = RoundStatus.PENDING;
    } else {
      const reviewedCount = await this.screeningReviewRepo.count({
        where: { assignment: { id: In(remaining.map((a) => a.id)) } },
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
}
