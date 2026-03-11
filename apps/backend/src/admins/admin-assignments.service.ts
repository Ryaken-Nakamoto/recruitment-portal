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
import { InterviewReview } from '../applications/entities/interview-review.entity';
import { ScreeningCriteria } from '../rubrics/entities/screening-criteria.entity';
import { ApplicationRound } from '../applications/enums/application-round.enum';
import { InterviewReviewStatus } from '../applications/enums/interview-review-status.enum';
import { RoundStatus } from '../applications/enums/round-status.enum';
import { Applicant } from '../applicants/entities/applicant.entity';
import { Recruiter } from '../recruiters/entities/recruiter.entity';
import { AccountStatus } from '../users/status';

// Keyed by `${appId}:${recruiterId}` — used to restore screening reviews after reassignment
type SavedScreeningReviews = Map<
  string,
  {
    scores: Array<{
      criteria: ScreeningReviewScore['criteria'];
      score: number;
    }>;
  }
>;

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
    @InjectRepository(InterviewReview)
    private readonly interviewReviewRepo: Repository<InterviewReview>,
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
        firstName: (a.applicant as Applicant).firstName,
        lastName: (a.applicant as Applicant).lastName,
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
    force = false,
  ): Promise<{ assigned: number }> {
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

    if (!force) {
      await this.checkReviewConflicts(applications);
    }

    // Delete only the interview review for each app's CURRENT round.
    // Reviews from other rounds (e.g. screening reviews on an interview-round app) must be preserved.
    for (const app of applications) {
      if (app.round !== ApplicationRound.SCREENING) {
        const reviewsToDelete = await this.interviewReviewRepo.find({
          where: {
            application: { id: app.id },
            round: app.round as unknown as ApplicationRound,
          },
          select: ['id'],
        });
        if (reviewsToDelete.length > 0) {
          await this.interviewReviewRepo.delete({
            id: In(reviewsToDelete.map((r) => r.id)),
          });
        }
      }
    }

    // Before deleting assignments, save screening review data for apps that have already
    // completed screening (i.e. are now in an interview round). Deleting assignments cascades
    // to delete their linked ScreeningReviews, so we restore them afterward.
    const interviewApps = applications.filter(
      (a) => a.round !== ApplicationRound.SCREENING,
    );
    const savedScreeningReviews = await this.collectScreeningReviews(
      interviewApps,
    );

    // Delete all existing assignments — cascades ScreeningReview + ScreeningReviewScore
    await this.assignmentRepo.delete({ application: In(applicationIds) });

    // Round-robin assignment
    const K = recruiters.length;
    let assigned = 0;
    // Track new assignments by `${appId}:${recruiterId}` for screening-review restoration
    const newAssignmentMap = new Map<string, Assignment>();

    for (let i = 0; i < applications.length; i++) {
      for (let j = 0; j < recruitersPerApp; j++) {
        const recruiter = recruiters[(i * recruitersPerApp + j) % K];
        const assignment = this.assignmentRepo.create({
          recruiter,
          application: applications[i],
        });
        const saved = await this.assignmentRepo.save(assignment);
        newAssignmentMap.set(`${applications[i].id}:${recruiter.id}`, saved);
        assigned++;
      }
    }

    // Restore screening reviews for recruiters who are still assigned after the reassignment.
    // If a recruiter was removed from the new set their historical screening data cannot be
    // preserved without a schema change (Assignment needs a `round` column).
    for (const [key, { scores }] of savedScreeningReviews) {
      const newAssignment = newAssignmentMap.get(key);
      if (newAssignment) {
        const restoredReview = this.screeningReviewRepo.create({
          assignment: newAssignment,
        });
        const savedReview = await this.screeningReviewRepo.save(restoredReview);
        if (scores.length > 0) {
          const scoreEntities = scores.map((s) =>
            this.screeningReviewScoreRepo.create({
              review: savedReview,
              criteria: s.criteria as unknown as ScreeningCriteria,
              score: s.score,
            }),
          );
          await this.screeningReviewScoreRepo.save(scoreEntities);
        }
      } else {
        const [appId, recruiterId] = key.split(':');
        this.logger.warn(
          `Screening review for recruiter ${recruiterId} on application ${appId} could not be preserved — recruiter removed from the new assignment set`,
        );
      }
    }

    // Mark each application IN_PROGRESS now that at least one recruiter is assigned
    await this.applicationRepo.update(
      { id: In(applicationIds) },
      { roundStatus: RoundStatus.IN_PROGRESS },
    );

    this.logger.log(
      `Replaced assignments for ${applications.length} applications, created ${assigned} new assignments`,
    );
    return { assigned };
  }

  // Checks only the reviews relevant to each application's CURRENT round.
  // Screening reviews on interview-round apps (from a completed screening phase) are not conflicts.
  private async checkReviewConflicts(
    applications: Application[],
  ): Promise<void> {
    // Screening-round apps: block if any screening review already exists
    const screeningApps = applications.filter(
      (a) => a.round === ApplicationRound.SCREENING,
    );
    if (screeningApps.length > 0) {
      const assignments = await this.assignmentRepo.find({
        where: { application: { id: In(screeningApps.map((a) => a.id)) } },
        relations: ['application', 'application.applicant'],
      });

      if (assignments.length > 0) {
        const submittedReviews = await this.screeningReviewRepo.find({
          where: { assignment: { id: In(assignments.map((a) => a.id)) } },
          relations: ['assignment'],
        });

        if (submittedReviews.length > 0) {
          const assignmentById = new Map(assignments.map((a) => [a.id, a]));
          const appMap = new Map<
            number,
            { id: number; applicantName: string }
          >();
          for (const review of submittedReviews) {
            const assignment = assignmentById.get(
              (review.assignment as Assignment).id,
            )!;
            const app = assignment.application as Application;
            const applicant = app.applicant as Applicant;
            if (!appMap.has(app.id)) {
              appMap.set(app.id, {
                id: app.id,
                applicantName: `${applicant.firstName} ${applicant.lastName}`,
              });
            }
          }
          throw new ConflictException({
            statusCode: 409,
            blockType: 'submitted',
            conflictingApps: Array.from(appMap.values()),
          });
        }
      }
    }

    // Interview-round apps: block only if the review for THAT SPECIFIC round is non-draft
    const interviewApps = applications.filter(
      (a) => a.round !== ApplicationRound.SCREENING,
    );
    const appMap = new Map<number, { id: number; applicantName: string }>();

    for (const app of interviewApps) {
      const blockingReviews = await this.interviewReviewRepo.find({
        where: {
          application: { id: app.id },
          round: app.round as unknown as ApplicationRound,
          status: In([
            InterviewReviewStatus.PENDING_APPROVAL,
            InterviewReviewStatus.APPROVED,
          ]),
        },
        relations: ['application', 'application.applicant'],
      });

      for (const review of blockingReviews) {
        const a = review.application as Application;
        const applicant = a.applicant as Applicant;
        if (!appMap.has(a.id)) {
          appMap.set(a.id, {
            id: a.id,
            applicantName: `${applicant.firstName} ${applicant.lastName}`,
          });
        }
      }
    }

    if (appMap.size > 0) {
      throw new ConflictException({
        statusCode: 409,
        blockType: 'in_progress',
        conflictingApps: Array.from(appMap.values()),
      });
    }
  }

  // Saves screening review data for interview-round apps so it can be restored after
  // assignments are deleted. Keyed by `${appId}:${recruiterId}`.
  private async collectScreeningReviews(
    interviewApps: Application[],
  ): Promise<SavedScreeningReviews> {
    const result: SavedScreeningReviews = new Map();
    if (interviewApps.length === 0) return result;

    const reviews = await this.screeningReviewRepo.find({
      where: {
        assignment: { application: { id: In(interviewApps.map((a) => a.id)) } },
      },
      relations: [
        'assignment',
        'assignment.recruiter',
        'assignment.application',
        'scores',
        'scores.criteria',
      ],
    });

    for (const review of reviews) {
      const assignment = review.assignment as Assignment;
      const recruiter = assignment.recruiter as Recruiter;
      const app = assignment.application as Application;
      result.set(`${app.id}:${recruiter.id}`, {
        scores: (review.scores as ScreeningReviewScore[]).map((s) => ({
          criteria: s.criteria,
          score: s.score,
        })),
      });
    }

    return result;
  }
}
