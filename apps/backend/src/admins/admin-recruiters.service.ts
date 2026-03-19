import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { Recruiter } from '../recruiters/entities/recruiter.entity';
import { User } from '../users/user.entity';
import { AccountStatus } from '../users/status';
import { CognitoService } from '../util/cognito/cognito.service';
import { Assignment } from '../applications/entities/assignment.entity';
import { ScreeningReview } from '../applications/entities/screening-review.entity';
import { InterviewReview } from '../applications/entities/interview-review.entity';
import { ApplicationRound } from '../applications/enums/application-round.enum';

@Injectable()
export class AdminRecruitersService {
  private readonly logger = new Logger(AdminRecruitersService.name);

  constructor(
    @InjectRepository(Recruiter)
    private readonly recruiterRepo: Repository<Recruiter>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Assignment)
    private readonly assignmentRepo: Repository<Assignment>,
    @InjectRepository(ScreeningReview)
    private readonly screeningReviewRepo: Repository<ScreeningReview>,
    @InjectRepository(InterviewReview)
    private readonly interviewReviewRepo: Repository<InterviewReview>,
    private readonly cognitoService: CognitoService,
  ) {}

  async listRecruiters(page: number, limit: number) {
    const [data, total] = await this.recruiterRepo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdDate: 'DESC' },
    });
    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async inviteRecruiter(email: string): Promise<Recruiter> {
    const existing = await this.userRepo.findOneBy({ email });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const recruiter = this.recruiterRepo.create({
      firstName: null,
      lastName: null,
      email,
      accountStatus: AccountStatus.INVITE_SENT,
    });
    await this.recruiterRepo.save(recruiter);

    try {
      await this.cognitoService.adminCreateUser(email);
    } catch (error) {
      await this.recruiterRepo.remove(recruiter);
      this.logger.error(
        `Cognito invite failed for ${email}, rolled back DB row`,
        error,
      );
      throw new InternalServerErrorException(
        'Failed to create login credentials. Please try again.',
      );
    }

    return recruiter;
  }

  async deactivateRecruiter(id: number): Promise<Recruiter> {
    const recruiter = await this.recruiterRepo.findOneBy({ id });
    if (!recruiter) {
      throw new NotFoundException(`Recruiter with id ${id} not found`);
    }
    recruiter.accountStatus = AccountStatus.DEACTIVATED;
    return this.recruiterRepo.save(recruiter);
  }

  async reactivateRecruiter(id: number): Promise<Recruiter> {
    const recruiter = await this.recruiterRepo.findOneBy({ id });
    if (!recruiter) {
      throw new NotFoundException(`Recruiter with id ${id} not found`);
    }
    recruiter.accountStatus = AccountStatus.ACTIVATED;
    return this.recruiterRepo.save(recruiter);
  }

  async getRecruiterDetail(id: number) {
    const recruiter = await this.recruiterRepo.findOneBy({ id });
    if (!recruiter) {
      throw new NotFoundException(`Recruiter with id ${id} not found`);
    }

    const assignments = await this.assignmentRepo.find({
      where: { recruiter: { id } },
      relations: ['application', 'application.applicant'],
      order: { assignedAt: 'DESC' },
    });

    const assignmentIds = assignments.map((a) => a.id);

    const screeningReviews =
      assignmentIds.length > 0
        ? await this.screeningReviewRepo.find({
            where: { assignment: { id: In(assignmentIds) } },
            relations: ['assignment'],
          })
        : [];

    const screeningReviewByAssignmentId = new Map(
      screeningReviews.map((sr) => [sr.assignment.id, sr]),
    );

    const interviewReviews = await this.interviewReviewRepo.find({
      where: { submittedBy: { id } },
      relations: ['application'],
    });

    const interviewReviewByKey = new Map(
      interviewReviews.map((ir) => [`${ir.application.id}:${ir.round}`, ir]),
    );

    const assignmentDetails = assignments.map((a) => {
      const round = a.application.round;
      let reviewStatus: string;

      if (round === ApplicationRound.SCREENING) {
        reviewStatus = screeningReviewByAssignmentId.has(a.id)
          ? 'submitted'
          : 'not_started';
      } else {
        const ir = interviewReviewByKey.get(`${a.application.id}:${round}`);
        reviewStatus = ir ? ir.status : 'not_started';
      }

      return {
        assignmentId: a.id,
        applicationId: a.application.id,
        applicantName: a.application.applicant.name,
        round: a.application.round,
        roundStatus: a.application.roundStatus,
        reviewStatus,
        assignedAt: a.assignedAt,
      };
    });

    const total = assignmentDetails.length;
    const submitted = assignmentDetails.filter(
      (a) => a.reviewStatus === 'submitted' || a.reviewStatus === 'approved',
    ).length;
    const notStarted = assignmentDetails.filter(
      (a) => a.reviewStatus === 'not_started',
    ).length;
    const inProgress = assignmentDetails.filter(
      (a) =>
        a.reviewStatus === 'draft' || a.reviewStatus === 'pending_approval',
    ).length;

    return {
      id: recruiter.id,
      firstName: recruiter.firstName,
      lastName: recruiter.lastName,
      email: recruiter.email,
      accountStatus: recruiter.accountStatus,
      createdDate: recruiter.createdDate,
      stats: { total, submitted, notStarted, inProgress },
      assignments: assignmentDetails,
    };
  }
}
