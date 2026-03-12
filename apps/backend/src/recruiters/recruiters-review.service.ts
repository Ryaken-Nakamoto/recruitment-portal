import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
import { InterviewReviewScore } from '../applications/entities/interview-review-score.entity';
import { InterviewReviewApproval } from '../applications/entities/interview-review-approval.entity';
import { ApplicationRound } from '../applications/enums/application-round.enum';
import { InterviewReviewStatus } from '../applications/enums/interview-review-status.enum';
import { RoundStatus } from '../applications/enums/round-status.enum';
import { ScreeningCriteria } from '../rubrics/entities/screening-criteria.entity';
import { InterviewCriteria } from '../rubrics/entities/interview-criteria.entity';
import { Recruiter } from './entities/recruiter.entity';
import { SaveScreeningReviewDto } from './dto/save-screening-review.dto';
import { SaveInterviewReviewDto } from './dto/save-interview-review.dto';

@Injectable()
export class RecruitersReviewService {
  private readonly logger = new Logger(RecruitersReviewService.name);

  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentRepo: Repository<Assignment>,
    @InjectRepository(Application)
    private readonly applicationRepo: Repository<Application>,
    @InjectRepository(ScreeningReview)
    private readonly screeningReviewRepo: Repository<ScreeningReview>,
    @InjectRepository(ScreeningReviewScore)
    private readonly screeningReviewScoreRepo: Repository<ScreeningReviewScore>,
    @InjectRepository(InterviewReview)
    private readonly interviewReviewRepo: Repository<InterviewReview>,
    @InjectRepository(InterviewReviewScore)
    private readonly interviewReviewScoreRepo: Repository<InterviewReviewScore>,
    @InjectRepository(InterviewReviewApproval)
    private readonly interviewReviewApprovalRepo: Repository<InterviewReviewApproval>,
    @InjectRepository(ScreeningCriteria)
    private readonly screeningCriteriaRepo: Repository<ScreeningCriteria>,
    @InjectRepository(InterviewCriteria)
    private readonly interviewCriteriaRepo: Repository<InterviewCriteria>,
  ) {}

  async listAssignments(
    recruiter: Recruiter,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;
    const [assignments, total] = await this.assignmentRepo.findAndCount({
      where: { recruiter: { id: recruiter.id } },
      relations: ['application', 'application.applicant'],
      skip,
      take: limit,
    });

    const data = await Promise.all(
      assignments.map(async (a) => {
        const app = a.application as Application;
        const applicant = app.applicant as {
          name: string;
        };

        let reviewStatus: string;

        if (app.round === 'screening') {
          const review = await this.screeningReviewRepo.findOne({
            where: { assignment: { id: a.id } },
          });
          reviewStatus = review ? 'submitted' : 'not_started';
        } else {
          const review = await this.interviewReviewRepo.findOne({
            where: {
              application: { id: app.id },
              round: app.round as unknown as ApplicationRound,
            },
          });
          if (!review) {
            reviewStatus = 'not_started';
          } else if (review.status === InterviewReviewStatus.DRAFT) {
            reviewStatus = 'draft';
          } else if (review.status === InterviewReviewStatus.PENDING_APPROVAL) {
            reviewStatus = 'pending_approval';
          } else {
            reviewStatus = 'approved';
          }
        }

        return {
          assignmentId: a.id,
          application: {
            id: app.id,
            round: app.round,
            applicantName: applicant.name,
          },
          reviewStatus,
        };
      }),
    );

    this.logger.log(
      `Listed ${data.length} assignments (page ${page}) for recruiter ${recruiter.id}`,
    );
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async submitScreeningReview(
    dto: SaveScreeningReviewDto,
    recruiter: Recruiter,
  ) {
    const assignment = await this.assignmentRepo.findOne({
      where: { id: dto.assignmentId, recruiter: { id: recruiter.id } },
      relations: ['application', 'application.applicant'],
    });
    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    const existing = await this.screeningReviewRepo.findOne({
      where: { assignment: { id: assignment.id } },
    });
    if (existing) {
      throw new ConflictException(
        'Screening review already submitted for this assignment',
      );
    }

    const app = assignment.application as Application;
    const submittedIds = new Set(dto.scores.map((s) => s.criteriaId));
    const criteria = await this.screeningCriteriaRepo.findBy({
      id: In(Array.from(submittedIds)),
    });
    if (criteria.length !== submittedIds.size) {
      throw new BadRequestException('One or more criteria IDs not found');
    }

    const review = this.screeningReviewRepo.create({ assignment });
    await this.screeningReviewRepo.save(review);

    const scoreEntities = dto.scores.map((s) => {
      const crit = criteria.find((c) => c.id === s.criteriaId)!;
      return this.screeningReviewScoreRepo.create({
        review,
        criteria: crit,
        score: s.score,
      });
    });
    await this.screeningReviewScoreRepo.save(scoreEntities);

    this.logger.log(
      `Screening review submitted for assignment ${assignment.id} by recruiter ${recruiter.id}`,
    );

    // Check if all assignments for this application now have reviews
    await this.checkScreeningCompletion(app.id);

    return { id: review.id };
  }

  async saveInterviewReview(dto: SaveInterviewReviewDto, recruiter: Recruiter) {
    const application = await this.applicationRepo.findOne({
      where: { id: dto.applicationId },
    });
    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Verify recruiter is assigned to this application/round
    const assignment = await this.assignmentRepo.findOne({
      where: {
        application: { id: dto.applicationId },
        recruiter: { id: recruiter.id },
      },
    });
    if (!assignment) {
      throw new ForbiddenException('Not assigned to this application');
    }

    let review = await this.interviewReviewRepo.findOne({
      where: { application: { id: dto.applicationId }, round: dto.round },
      relations: ['scores'],
    });

    if (review && review.status !== InterviewReviewStatus.DRAFT) {
      throw new ConflictException('Interview review is not in draft state');
    }

    if (!review) {
      review = this.interviewReviewRepo.create({
        application,
        round: dto.round,
        status: InterviewReviewStatus.DRAFT,
        submittedAt: null,
        submittedBy: recruiter,
      });
      await this.interviewReviewRepo.save(review);
    } else {
      review.submittedBy = recruiter;
      await this.interviewReviewRepo.save(review);
    }

    // Validate criteria exist
    const submittedIds = new Set(dto.scores.map((s) => s.criteriaId));
    const criteria = await this.interviewCriteriaRepo.findBy({
      id: In(Array.from(submittedIds)),
    });
    if (criteria.length !== submittedIds.size) {
      throw new BadRequestException('One or more criteria IDs not found');
    }

    // Delete existing scores and replace
    await this.interviewReviewScoreRepo.delete({ review: { id: review.id } });
    const scoreEntities = dto.scores.map((s) => {
      const crit = criteria.find((c) => c.id === s.criteriaId)!;
      return this.interviewReviewScoreRepo.create({
        review,
        criteria: crit,
        score: s.score,
      });
    });
    await this.interviewReviewScoreRepo.save(scoreEntities);

    this.logger.log(
      `Interview review saved for application ${dto.applicationId} round ${dto.round} by recruiter ${recruiter.id}`,
    );
    return { id: review.id };
  }

  async submitInterviewReview(reviewId: number, recruiter: Recruiter) {
    const review = await this.interviewReviewRepo.findOne({
      where: { id: reviewId },
      relations: ['application', 'scores'],
    });
    if (!review) {
      throw new NotFoundException('Interview review not found');
    }
    if (review.status !== InterviewReviewStatus.DRAFT) {
      throw new ConflictException('Interview review is not in draft state');
    }

    const app = review.application as Application;

    // Verify recruiter is assigned to this application
    const callerAssignment = await this.assignmentRepo.findOne({
      where: { application: { id: app.id }, recruiter: { id: recruiter.id } },
    });
    if (!callerAssignment) {
      throw new ForbiddenException('Not assigned to this application');
    }

    // Get all assignments for this application/round
    const allAssignments = await this.assignmentRepo.find({
      where: { application: { id: app.id } },
    });

    // Update review status
    review.status = InterviewReviewStatus.PENDING_APPROVAL;
    review.submittedAt = new Date();
    review.submittedBy = recruiter;
    await this.interviewReviewRepo.save(review);

    // Create approval rows
    const approvalEntities = allAssignments.map((a) =>
      this.interviewReviewApprovalRepo.create({
        review,
        assignment: a,
        approved: a.id === callerAssignment.id ? true : null,
        decidedAt: a.id === callerAssignment.id ? new Date() : null,
      }),
    );
    await this.interviewReviewApprovalRepo.save(approvalEntities);

    this.logger.log(
      `Interview review ${reviewId} submitted by recruiter ${recruiter.id}, ${approvalEntities.length} approval rows created`,
    );

    // If every approval row is already true (single-recruiter case), auto-approve immediately
    const allApproved = approvalEntities.every((a) => a.approved === true);
    if (allApproved) {
      review.status = InterviewReviewStatus.APPROVED;
      await this.interviewReviewRepo.save(review);

      const application = await this.applicationRepo.findOneByOrFail({
        id: app.id,
      });
      application.roundStatus = RoundStatus.AWAITING_ADMIN;
      await this.applicationRepo.save(application);

      this.logger.log(
        `Interview review ${reviewId} auto-approved (single recruiter), application ${app.id} set to AWAITING_ADMIN`,
      );
    }

    return { id: review.id, status: review.status };
  }

  async approveInterviewReview(
    reviewId: number,
    approved: boolean,
    recruiter: Recruiter,
  ) {
    const review = await this.interviewReviewRepo.findOne({
      where: { id: reviewId },
      relations: ['application', 'approvals', 'approvals.assignment'],
    });
    if (!review) {
      throw new NotFoundException('Interview review not found');
    }
    if (review.status !== InterviewReviewStatus.PENDING_APPROVAL) {
      throw new ConflictException('Interview review is not pending approval');
    }

    const app = review.application as Application;

    const callerAssignment = await this.assignmentRepo.findOne({
      where: { application: { id: app.id }, recruiter: { id: recruiter.id } },
    });
    if (!callerAssignment) {
      throw new ForbiddenException('Not assigned to this application');
    }

    const approvals = review.approvals as InterviewReviewApproval[];
    const callerApproval = approvals.find(
      (ap) => (ap.assignment as Assignment).id === callerAssignment.id,
    );
    if (!callerApproval) {
      throw new NotFoundException(
        'Approval record not found for this recruiter',
      );
    }

    callerApproval.approved = approved;
    callerApproval.decidedAt = new Date();
    await this.interviewReviewApprovalRepo.save(callerApproval);

    if (!approved) {
      // Rejection: reset to DRAFT, clear submittedBy, delete all approvals (scores preserved)
      review.status = InterviewReviewStatus.DRAFT;
      review.submittedBy = null;
      review.submittedAt = null;
      await this.interviewReviewRepo.save(review);
      await this.interviewReviewApprovalRepo.delete({
        review: { id: review.id },
      });

      this.logger.warn(
        `Interview review ${reviewId} rejected by recruiter ${recruiter.id}, reset to DRAFT`,
      );
      return { id: review.id, status: InterviewReviewStatus.DRAFT };
    }

    // Check if all approved
    const updatedApprovals = await this.interviewReviewApprovalRepo.find({
      where: { review: { id: review.id } },
    });
    const allApproved = updatedApprovals.every((ap) => ap.approved === true);

    if (allApproved) {
      review.status = InterviewReviewStatus.APPROVED;
      await this.interviewReviewRepo.save(review);

      // Advance application
      const application = await this.applicationRepo.findOneByOrFail({
        id: app.id,
      });
      application.roundStatus = RoundStatus.AWAITING_ADMIN;
      await this.applicationRepo.save(application);

      this.logger.log(
        `Interview review ${reviewId} fully approved, application ${app.id} set to AWAITING_ADMIN`,
      );
      return { id: review.id, status: InterviewReviewStatus.APPROVED };
    }

    return { id: review.id, status: review.status };
  }

  private async checkScreeningCompletion(applicationId: number): Promise<void> {
    const allAssignments = await this.assignmentRepo.find({
      where: { application: { id: applicationId } },
    });

    const reviewCount = await this.screeningReviewRepo.count({
      where: { assignment: { id: In(allAssignments.map((a) => a.id)) } },
    });

    if (reviewCount === allAssignments.length && allAssignments.length > 0) {
      const application = await this.applicationRepo.findOneByOrFail({
        id: applicationId,
      });
      application.roundStatus = RoundStatus.AWAITING_ADMIN;
      await this.applicationRepo.save(application);
      this.logger.log(
        `All screening reviews submitted for application ${applicationId}, set to AWAITING_ADMIN`,
      );
    }
  }
}
