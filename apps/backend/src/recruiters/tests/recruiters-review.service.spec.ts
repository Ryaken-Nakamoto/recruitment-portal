import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';

import { RecruitersReviewService } from '../recruiters-review.service';
import { Assignment } from '../../applications/entities/assignment.entity';
import { Application } from '../../applications/entities/application.entity';
import { ScreeningReview } from '../../applications/entities/screening-review.entity';
import { ScreeningReviewScore } from '../../applications/entities/screening-review-score.entity';
import { InterviewReview } from '../../applications/entities/interview-review.entity';
import { InterviewReviewScore } from '../../applications/entities/interview-review-score.entity';
import { InterviewReviewApproval } from '../../applications/entities/interview-review-approval.entity';
import { ScreeningCriteria } from '../../rubrics/entities/screening-criteria.entity';
import { InterviewCriteria } from '../../rubrics/entities/interview-criteria.entity';
import { InterviewReviewStatus } from '../../applications/enums/interview-review-status.enum';
import { RoundStatus } from '../../applications/enums/round-status.enum';
import { ApplicationRound } from '../../applications/enums/application-round.enum';
import { Recruiter } from '../entities/recruiter.entity';

type MockRepo<T> = Partial<Record<keyof Repository<T>, jest.Mock>> & {
  findAndCount?: jest.Mock;
};

function createMockRepo<T>(): MockRepo<T> {
  return {
    findOne: jest.fn(),
    findBy: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    findOneByOrFail: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
}

describe('RecruitersReviewService', () => {
  let service: RecruitersReviewService;
  let assignmentRepo: MockRepo<Assignment>;
  let applicationRepo: MockRepo<Application>;
  let screeningReviewRepo: MockRepo<ScreeningReview>;
  let screeningReviewScoreRepo: MockRepo<ScreeningReviewScore>;
  let interviewReviewRepo: MockRepo<InterviewReview>;
  let interviewReviewScoreRepo: MockRepo<InterviewReviewScore>;
  let interviewReviewApprovalRepo: MockRepo<InterviewReviewApproval>;
  let screeningCriteriaRepo: MockRepo<ScreeningCriteria>;
  let interviewCriteriaRepo: MockRepo<InterviewCriteria>;

  const recruiter = { id: 1 } as Recruiter;

  beforeEach(async () => {
    assignmentRepo = createMockRepo<Assignment>();
    applicationRepo = createMockRepo<Application>();
    screeningReviewRepo = createMockRepo<ScreeningReview>();
    screeningReviewScoreRepo = createMockRepo<ScreeningReviewScore>();
    interviewReviewRepo = createMockRepo<InterviewReview>();
    interviewReviewScoreRepo = createMockRepo<InterviewReviewScore>();
    interviewReviewApprovalRepo = createMockRepo<InterviewReviewApproval>();
    screeningCriteriaRepo = createMockRepo<ScreeningCriteria>();
    interviewCriteriaRepo = createMockRepo<InterviewCriteria>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecruitersReviewService,
        { provide: getRepositoryToken(Assignment), useValue: assignmentRepo },
        { provide: getRepositoryToken(Application), useValue: applicationRepo },
        {
          provide: getRepositoryToken(ScreeningReview),
          useValue: screeningReviewRepo,
        },
        {
          provide: getRepositoryToken(ScreeningReviewScore),
          useValue: screeningReviewScoreRepo,
        },
        {
          provide: getRepositoryToken(InterviewReview),
          useValue: interviewReviewRepo,
        },
        {
          provide: getRepositoryToken(InterviewReviewScore),
          useValue: interviewReviewScoreRepo,
        },
        {
          provide: getRepositoryToken(InterviewReviewApproval),
          useValue: interviewReviewApprovalRepo,
        },
        {
          provide: getRepositoryToken(ScreeningCriteria),
          useValue: screeningCriteriaRepo,
        },
        {
          provide: getRepositoryToken(InterviewCriteria),
          useValue: interviewCriteriaRepo,
        },
      ],
    }).compile();

    service = module.get<RecruitersReviewService>(RecruitersReviewService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ──────────────────────────────────────────────────────────────────────
  // listAssignments
  // ──────────────────────────────────────────────────────────────────────
  describe('listAssignments', () => {
    const makeAssignment = (id: number, round: ApplicationRound) => ({
      id,
      application: {
        id: id * 10,
        round,
        applicant: { name: 'Jane Doe' },
      },
    });

    it('returns paginated data with total and totalPages', async () => {
      const assignment = makeAssignment(1, ApplicationRound.SCREENING);
      assignmentRepo.findAndCount!.mockResolvedValue([[assignment], 1]);
      screeningReviewRepo.findOne!.mockResolvedValue(null);

      const result = await service.listAssignments(recruiter, 1, 20);

      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.data).toHaveLength(1);
    });

    it('includes applicantName, round, and reviewStatus in each item', async () => {
      const assignment = makeAssignment(1, ApplicationRound.SCREENING);
      assignmentRepo.findAndCount!.mockResolvedValue([[assignment], 1]);
      screeningReviewRepo.findOne!.mockResolvedValue(null);

      const result = await service.listAssignments(recruiter, 1, 20);

      expect(result.data[0].application.applicantName).toBe('Jane Doe');
      expect(result.data[0].application.round).toBe(ApplicationRound.SCREENING);
      expect(result.data[0].reviewStatus).toBe('not_started');
    });

    it('returns reviewStatus "submitted" for a completed screening review', async () => {
      const assignment = makeAssignment(1, ApplicationRound.SCREENING);
      assignmentRepo.findAndCount!.mockResolvedValue([[assignment], 1]);
      screeningReviewRepo.findOne!.mockResolvedValue({
        id: 5,
      } as unknown as ScreeningReview);

      const result = await service.listAssignments(recruiter, 1, 20);

      expect(result.data[0].reviewStatus).toBe('submitted');
    });

    it('returns reviewStatus "draft" for an in-progress interview review', async () => {
      const assignment = makeAssignment(
        1,
        ApplicationRound.TECHNICAL_INTERVIEW,
      );
      assignmentRepo.findAndCount!.mockResolvedValue([[assignment], 1]);
      interviewReviewRepo.findOne!.mockResolvedValue({
        id: 10,
        status: InterviewReviewStatus.DRAFT,
      } as unknown as InterviewReview);

      const result = await service.listAssignments(recruiter, 1, 20);

      expect(result.data[0].reviewStatus).toBe('draft');
    });

    it('returns reviewStatus "pending_approval" for a submitted interview review', async () => {
      const assignment = makeAssignment(
        1,
        ApplicationRound.BEHAVIORAL_INTERVIEW,
      );
      assignmentRepo.findAndCount!.mockResolvedValue([[assignment], 1]);
      interviewReviewRepo.findOne!.mockResolvedValue({
        id: 10,
        status: InterviewReviewStatus.PENDING_APPROVAL,
      } as unknown as InterviewReview);

      const result = await service.listAssignments(recruiter, 1, 20);

      expect(result.data[0].reviewStatus).toBe('pending_approval');
    });

    it('returns reviewStatus "approved" for an approved interview review', async () => {
      const assignment = makeAssignment(
        1,
        ApplicationRound.TECHNICAL_INTERVIEW,
      );
      assignmentRepo.findAndCount!.mockResolvedValue([[assignment], 1]);
      interviewReviewRepo.findOne!.mockResolvedValue({
        id: 10,
        status: InterviewReviewStatus.APPROVED,
      } as unknown as InterviewReview);

      const result = await service.listAssignments(recruiter, 1, 20);

      expect(result.data[0].reviewStatus).toBe('approved');
    });

    it('calculates totalPages correctly for multiple pages', async () => {
      assignmentRepo.findAndCount!.mockResolvedValue([[], 45]);

      const result = await service.listAssignments(recruiter, 2, 20);

      expect(result.totalPages).toBe(3);
      expect(result.page).toBe(2);
    });

    it('returns empty data when recruiter has no assignments', async () => {
      assignmentRepo.findAndCount!.mockResolvedValue([[], 0]);

      const result = await service.listAssignments(recruiter, 1, 20);

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // submitScreeningReview
  // ──────────────────────────────────────────────────────────────────────
  describe('submitScreeningReview', () => {
    const baseAssignment = {
      id: 10,
      application: { id: 5, round: ApplicationRound.SCREENING } as Application,
    } as Assignment;

    it('creates a ScreeningReview and scores atomically', async () => {
      const criteria = [{ id: 1 }, { id: 2 }] as ScreeningCriteria[];
      assignmentRepo.findOne!.mockResolvedValue({ ...baseAssignment });
      screeningReviewRepo.findOne!.mockResolvedValue(null);
      screeningCriteriaRepo.findBy!.mockResolvedValue(criteria);
      screeningReviewRepo.create!.mockImplementation((d) => ({ id: 99, ...d }));
      screeningReviewRepo.save!.mockImplementation((r) => Promise.resolve(r));
      screeningReviewScoreRepo.create!.mockImplementation((d) => d);
      screeningReviewScoreRepo.save!.mockResolvedValue([]);
      assignmentRepo.find!.mockResolvedValue([baseAssignment]);
      screeningReviewRepo.count!.mockResolvedValue(0); // not all done yet

      const result = await service.submitScreeningReview(
        {
          assignmentId: 10,
          scores: [
            { criteriaId: 1, score: 1 },
            { criteriaId: 2, score: 2 },
          ],
        },
        recruiter,
      );

      expect(screeningReviewRepo.create).toHaveBeenCalled();
      expect(screeningReviewScoreRepo.save).toHaveBeenCalled();
      expect(result).toHaveProperty('id');
    });

    it('throws ConflictException if review already submitted', async () => {
      assignmentRepo.findOne!.mockResolvedValue({ ...baseAssignment });
      screeningReviewRepo.findOne!.mockResolvedValue({
        id: 88,
      } as ScreeningReview);

      await expect(
        service.submitScreeningReview(
          { assignmentId: 10, scores: [] },
          recruiter,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException if assignment not found', async () => {
      assignmentRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.submitScreeningReview(
          { assignmentId: 99, scores: [] },
          recruiter,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('advances application to AWAITING_ADMIN when all assignments reviewed', async () => {
      const criteria = [{ id: 1 }] as ScreeningCriteria[];
      assignmentRepo.findOne!.mockResolvedValue({ ...baseAssignment });
      screeningReviewRepo.findOne!.mockResolvedValue(null);
      screeningCriteriaRepo.findBy!.mockResolvedValue(criteria);
      screeningReviewRepo.create!.mockImplementation((d) => ({
        id: 100,
        ...d,
      }));
      screeningReviewRepo.save!.mockImplementation((r) => Promise.resolve(r));
      screeningReviewScoreRepo.create!.mockImplementation((d) => d);
      screeningReviewScoreRepo.save!.mockResolvedValue([]);

      // All assignments now have reviews
      assignmentRepo.find!.mockResolvedValue([baseAssignment]);
      screeningReviewRepo.count!.mockResolvedValue(1); // count equals assignments.length

      const mockApp = {
        id: 5,
        roundStatus: RoundStatus.IN_PROGRESS,
      } as Application;
      applicationRepo.findOneByOrFail!.mockResolvedValue(mockApp);
      applicationRepo.save!.mockResolvedValue({
        ...mockApp,
        roundStatus: RoundStatus.AWAITING_ADMIN,
      });

      await service.submitScreeningReview(
        { assignmentId: 10, scores: [{ criteriaId: 1, score: 1 }] },
        recruiter,
      );

      expect(applicationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ roundStatus: RoundStatus.AWAITING_ADMIN }),
      );
    });

    it('does not advance application when some assignments still have no review', async () => {
      const criteria = [{ id: 1 }] as ScreeningCriteria[];
      const secondAssignment = {
        id: 11,
        application: baseAssignment.application,
      } as Assignment;
      assignmentRepo.findOne!.mockResolvedValue({ ...baseAssignment });
      screeningReviewRepo.findOne!.mockResolvedValue(null);
      screeningCriteriaRepo.findBy!.mockResolvedValue(criteria);
      screeningReviewRepo.create!.mockImplementation((d) => ({
        id: 100,
        ...d,
      }));
      screeningReviewRepo.save!.mockImplementation((r) => Promise.resolve(r));
      screeningReviewScoreRepo.create!.mockImplementation((d) => d);
      screeningReviewScoreRepo.save!.mockResolvedValue([]);

      // 2 assignments but only 1 review (the one just submitted)
      assignmentRepo.find!.mockResolvedValue([
        baseAssignment,
        secondAssignment,
      ]);
      screeningReviewRepo.count!.mockResolvedValue(1);

      await service.submitScreeningReview(
        { assignmentId: 10, scores: [{ criteriaId: 1, score: 1 }] },
        recruiter,
      );

      expect(applicationRepo.save).not.toHaveBeenCalled();
    });

    it('throws BadRequestException if a criteria ID does not exist', async () => {
      assignmentRepo.findOne!.mockResolvedValue({ ...baseAssignment });
      screeningReviewRepo.findOne!.mockResolvedValue(null);
      // Only 1 criteria found but 2 submitted
      screeningCriteriaRepo.findBy!.mockResolvedValue([
        { id: 1 },
      ] as ScreeningCriteria[]);

      await expect(
        service.submitScreeningReview(
          {
            assignmentId: 10,
            scores: [
              { criteriaId: 1, score: 1 },
              { criteriaId: 999, score: 2 },
            ],
          },
          recruiter,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // saveInterviewReview
  // ──────────────────────────────────────────────────────────────────────
  describe('saveInterviewReview', () => {
    const mockApp = {
      id: 5,
      round: ApplicationRound.TECHNICAL_INTERVIEW,
    } as Application;
    const assignment = { id: 10 } as Assignment;
    const criteria = [{ id: 201 }, { id: 202 }] as InterviewCriteria[];

    const dto = {
      applicationId: 5,
      round: ApplicationRound.TECHNICAL_INTERVIEW,
      scores: [
        { criteriaId: 201, score: 7.5 },
        { criteriaId: 202, score: 6.0 },
      ],
    };

    it('throws NotFoundException if application not found', async () => {
      applicationRepo.findOne!.mockResolvedValue(null);

      await expect(service.saveInterviewReview(dto, recruiter)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException if recruiter not assigned', async () => {
      applicationRepo.findOne!.mockResolvedValue(mockApp);
      assignmentRepo.findOne!.mockResolvedValue(null);

      await expect(service.saveInterviewReview(dto, recruiter)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ConflictException if existing review is not in DRAFT', async () => {
      applicationRepo.findOne!.mockResolvedValue(mockApp);
      assignmentRepo.findOne!.mockResolvedValue(assignment);
      interviewReviewRepo.findOne!.mockResolvedValue({
        id: 20,
        status: InterviewReviewStatus.PENDING_APPROVAL,
        scores: [],
      } as unknown as InterviewReview);

      await expect(service.saveInterviewReview(dto, recruiter)).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws BadRequestException if a criteria ID does not exist', async () => {
      applicationRepo.findOne!.mockResolvedValue(mockApp);
      assignmentRepo.findOne!.mockResolvedValue(assignment);
      interviewReviewRepo.findOne!.mockResolvedValue(null);
      const newReview = {
        id: 20,
        status: InterviewReviewStatus.DRAFT,
      } as InterviewReview;
      interviewReviewRepo.create!.mockReturnValue(newReview);
      interviewReviewRepo.save!.mockResolvedValue(newReview);
      // Only 1 of 2 criteria found
      interviewCriteriaRepo.findBy!.mockResolvedValue([
        { id: 201 },
      ] as InterviewCriteria[]);

      await expect(service.saveInterviewReview(dto, recruiter)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('creates a new DRAFT review when none exists', async () => {
      applicationRepo.findOne!.mockResolvedValue(mockApp);
      assignmentRepo.findOne!.mockResolvedValue(assignment);
      interviewReviewRepo.findOne!.mockResolvedValue(null);
      const newReview = {
        id: 20,
        status: InterviewReviewStatus.DRAFT,
      } as InterviewReview;
      interviewReviewRepo.create!.mockReturnValue(newReview);
      interviewReviewRepo.save!.mockResolvedValue(newReview);
      interviewCriteriaRepo.findBy!.mockResolvedValue(criteria);
      interviewReviewScoreRepo.delete!.mockResolvedValue(undefined);
      interviewReviewScoreRepo.create!.mockImplementation((d) => d);
      interviewReviewScoreRepo.save!.mockResolvedValue([]);

      const result = await service.saveInterviewReview(dto, recruiter);

      expect(interviewReviewRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: InterviewReviewStatus.DRAFT }),
      );
      expect(result).toEqual({ id: 20 });
    });

    it('updates submittedBy and replaces scores on an existing DRAFT review', async () => {
      applicationRepo.findOne!.mockResolvedValue(mockApp);
      assignmentRepo.findOne!.mockResolvedValue(assignment);
      const existingReview = {
        id: 20,
        status: InterviewReviewStatus.DRAFT,
        submittedBy: { id: 99 },
        scores: [],
      } as unknown as InterviewReview;
      interviewReviewRepo.findOne!.mockResolvedValue(existingReview);
      interviewReviewRepo.save!.mockImplementation((r) => Promise.resolve(r));
      interviewCriteriaRepo.findBy!.mockResolvedValue(criteria);
      interviewReviewScoreRepo.delete!.mockResolvedValue(undefined);
      interviewReviewScoreRepo.create!.mockImplementation((d) => d);
      interviewReviewScoreRepo.save!.mockResolvedValue([]);

      await service.saveInterviewReview(dto, recruiter);

      // Old scores deleted and new ones saved
      expect(interviewReviewScoreRepo.delete).toHaveBeenCalledWith({
        review: { id: 20 },
      });
      expect(interviewReviewScoreRepo.save).toHaveBeenCalled();
      // submittedBy updated to the current recruiter
      expect(existingReview.submittedBy).toEqual(recruiter);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // submitInterviewReview
  // ──────────────────────────────────────────────────────────────────────
  describe('submitInterviewReview', () => {
    const mockApp = { id: 5 } as Application;
    const callerAssignment = { id: 10 } as Assignment;
    const otherAssignment = { id: 11 } as Assignment;

    it('sets status to PENDING_APPROVAL and creates approval rows', async () => {
      const freshReview = {
        id: 20,
        application: mockApp,
        status: InterviewReviewStatus.DRAFT,
        scores: [],
      } as unknown as InterviewReview;

      interviewReviewRepo.findOne!.mockResolvedValue(freshReview);
      assignmentRepo.findOne!.mockResolvedValue({ ...callerAssignment });
      assignmentRepo.find!.mockResolvedValue([
        { ...callerAssignment },
        { ...otherAssignment },
      ]);
      interviewReviewRepo.save!.mockImplementation((r) => Promise.resolve(r));
      interviewReviewApprovalRepo.create!.mockImplementation((d) => d);
      interviewReviewApprovalRepo.save!.mockResolvedValue([]);

      const result = await service.submitInterviewReview(20, recruiter);

      expect(interviewReviewRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: InterviewReviewStatus.PENDING_APPROVAL,
        }),
      );
      // 2 approvals: submitter (auto-approved) + other
      expect(interviewReviewApprovalRepo.create).toHaveBeenCalledTimes(2);
      const calls = (interviewReviewApprovalRepo.create as jest.Mock).mock
        .calls;
      const submitterCall = calls.find((c: unknown[]) => {
        const obj = c[0] as Record<string, Record<string, unknown>>;
        return obj.assignment?.id === callerAssignment.id;
      });
      const otherCall = calls.find((c: unknown[]) => {
        const obj = c[0] as Record<string, Record<string, unknown>>;
        return obj.assignment?.id === otherAssignment.id;
      });
      expect(submitterCall[0].approved).toBe(true);
      expect(otherCall[0].approved).toBeNull();
      expect(result.status).toBe(InterviewReviewStatus.PENDING_APPROVAL);
    });

    it('auto-approves and sets AWAITING_ADMIN when only 1 recruiter is assigned (bug fix)', async () => {
      // Edge case: single recruiter assigned — submitting should immediately resolve
      const freshReview = {
        id: 20,
        application: mockApp,
        status: InterviewReviewStatus.DRAFT,
        scores: [],
      } as unknown as InterviewReview;

      interviewReviewRepo.findOne!.mockResolvedValue(freshReview);
      assignmentRepo.findOne!.mockResolvedValue({ ...callerAssignment });
      // Only the caller's assignment exists
      assignmentRepo.find!.mockResolvedValue([{ ...callerAssignment }]);
      interviewReviewRepo.save!.mockImplementation((r) => Promise.resolve(r));
      interviewReviewApprovalRepo.create!.mockImplementation((d) => d);
      interviewReviewApprovalRepo.save!.mockResolvedValue([]);

      const mockApplication = {
        id: 5,
        roundStatus: RoundStatus.IN_PROGRESS,
      } as Application;
      applicationRepo.findOneByOrFail!.mockResolvedValue(mockApplication);
      applicationRepo.save!.mockImplementation((r) => Promise.resolve(r));

      const result = await service.submitInterviewReview(20, recruiter);

      // Review should be APPROVED, not PENDING_APPROVAL
      expect(interviewReviewRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: InterviewReviewStatus.APPROVED }),
      );
      // Application should advance to AWAITING_ADMIN
      expect(applicationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ roundStatus: RoundStatus.AWAITING_ADMIN }),
      );
      expect(result.status).toBe(InterviewReviewStatus.APPROVED);
    });

    it('throws ConflictException if review not in DRAFT', async () => {
      interviewReviewRepo.findOne!.mockResolvedValue({
        id: 20,
        application: mockApp,
        status: InterviewReviewStatus.PENDING_APPROVAL,
        scores: [],
      } as unknown as InterviewReview);

      await expect(
        service.submitInterviewReview(20, recruiter),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException if review not found', async () => {
      interviewReviewRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.submitInterviewReview(20, recruiter),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if recruiter not assigned', async () => {
      interviewReviewRepo.findOne!.mockResolvedValue({
        id: 20,
        application: mockApp,
        status: InterviewReviewStatus.DRAFT,
        scores: [],
      } as unknown as InterviewReview);
      assignmentRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.submitInterviewReview(20, recruiter),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ConflictException if review is already APPROVED', async () => {
      interviewReviewRepo.findOne!.mockResolvedValue({
        id: 20,
        application: mockApp,
        status: InterviewReviewStatus.APPROVED,
        scores: [],
      } as unknown as InterviewReview);

      await expect(
        service.submitInterviewReview(20, recruiter),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // approveInterviewReview
  // ──────────────────────────────────────────────────────────────────────
  describe('approveInterviewReview', () => {
    const mockApp = { id: 5 } as Application;
    const callerAssignment = { id: 10 } as Assignment;
    const otherAssignment = { id: 11 } as Assignment;

    function makePendingReview() {
      const approvalForCaller = {
        id: 1,
        assignment: { ...callerAssignment },
        approved: null,
        decidedAt: null,
      } as InterviewReviewApproval;
      const approvalForOther = {
        id: 2,
        assignment: { ...otherAssignment },
        approved: true,
        decidedAt: new Date(),
      } as InterviewReviewApproval;
      return {
        review: {
          id: 20,
          application: mockApp,
          status: InterviewReviewStatus.PENDING_APPROVAL,
          approvals: [approvalForCaller, approvalForOther],
        } as unknown as InterviewReview,
        approvalForCaller,
        approvalForOther,
      };
    }

    it('sets APPROVED and AWAITING_ADMIN when all approve', async () => {
      const { review, approvalForCaller, approvalForOther } =
        makePendingReview();

      interviewReviewRepo.findOne!.mockResolvedValue(review);
      assignmentRepo.findOne!.mockResolvedValue({ ...callerAssignment });
      interviewReviewApprovalRepo.save!.mockResolvedValue({
        ...approvalForCaller,
        approved: true,
      });
      interviewReviewApprovalRepo.find!.mockResolvedValue([
        { ...approvalForCaller, approved: true },
        { ...approvalForOther, approved: true },
      ]);
      interviewReviewRepo.save!.mockImplementation((r) => Promise.resolve(r));
      const mockApplication = {
        id: 5,
        roundStatus: RoundStatus.IN_PROGRESS,
      } as Application;
      applicationRepo.findOneByOrFail!.mockResolvedValue(mockApplication);
      applicationRepo.save!.mockImplementation((r) => Promise.resolve(r));

      const result = await service.approveInterviewReview(20, true, recruiter);

      expect(interviewReviewRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: InterviewReviewStatus.APPROVED }),
      );
      expect(applicationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ roundStatus: RoundStatus.AWAITING_ADMIN }),
      );
      expect(result.status).toBe(InterviewReviewStatus.APPROVED);
    });

    it('does not advance if one other recruiter still has null approval', async () => {
      const thirdAssignment = { id: 12 } as Assignment;
      const approvalForCaller = {
        id: 1,
        assignment: { ...callerAssignment },
        approved: null,
        decidedAt: null,
      } as InterviewReviewApproval;
      const approvalForOther = {
        id: 2,
        assignment: { ...otherAssignment },
        approved: true,
        decidedAt: new Date(),
      } as InterviewReviewApproval;
      const approvalForThird = {
        id: 3,
        assignment: { ...thirdAssignment },
        approved: null,
        decidedAt: null,
      } as InterviewReviewApproval;
      const review = {
        id: 20,
        application: mockApp,
        status: InterviewReviewStatus.PENDING_APPROVAL,
        approvals: [approvalForCaller, approvalForOther, approvalForThird],
      } as unknown as InterviewReview;

      interviewReviewRepo.findOne!.mockResolvedValue(review);
      assignmentRepo.findOne!.mockResolvedValue({ ...callerAssignment });
      interviewReviewApprovalRepo.save!.mockResolvedValue({
        ...approvalForCaller,
        approved: true,
      });
      // Third is still null
      interviewReviewApprovalRepo.find!.mockResolvedValue([
        { ...approvalForCaller, approved: true },
        { ...approvalForOther, approved: true },
        { ...approvalForThird, approved: null },
      ]);
      interviewReviewRepo.save!.mockImplementation((r) => Promise.resolve(r));

      const result = await service.approveInterviewReview(20, true, recruiter);

      expect(applicationRepo.save).not.toHaveBeenCalled();
      expect(result.status).toBe(InterviewReviewStatus.PENDING_APPROVAL);
    });

    it('resets to DRAFT and preserves scores when one rejects', async () => {
      const { review, approvalForCaller } = makePendingReview();

      interviewReviewRepo.findOne!.mockResolvedValue(review);
      assignmentRepo.findOne!.mockResolvedValue({ ...callerAssignment });
      interviewReviewApprovalRepo.save!.mockResolvedValue({
        ...approvalForCaller,
        approved: false,
      });
      interviewReviewRepo.save!.mockImplementation((r) => Promise.resolve(r));
      interviewReviewApprovalRepo.delete!.mockResolvedValue(undefined);

      const result = await service.approveInterviewReview(20, false, recruiter);

      expect(interviewReviewRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: InterviewReviewStatus.DRAFT,
          submittedBy: null,
          submittedAt: null,
        }),
      );
      // Scores not deleted — only approvals cleared
      expect(interviewReviewApprovalRepo.delete).toHaveBeenCalled();
      expect(interviewReviewScoreRepo.delete).not.toHaveBeenCalled();
      expect(result.status).toBe(InterviewReviewStatus.DRAFT);
    });

    it('rejection clears all approval rows (not just the rejector)', async () => {
      const { review, approvalForCaller } = makePendingReview();

      interviewReviewRepo.findOne!.mockResolvedValue(review);
      assignmentRepo.findOne!.mockResolvedValue({ ...callerAssignment });
      interviewReviewApprovalRepo.save!.mockResolvedValue({
        ...approvalForCaller,
        approved: false,
      });
      interviewReviewRepo.save!.mockImplementation((r) => Promise.resolve(r));
      interviewReviewApprovalRepo.delete!.mockResolvedValue(undefined);

      await service.approveInterviewReview(20, false, recruiter);

      // Delete by review, not by individual approval ID
      expect(interviewReviewApprovalRepo.delete).toHaveBeenCalledWith({
        review: { id: 20 },
      });
    });

    it('throws NotFoundException if recruiter has no approval record', async () => {
      // Recruiter is assigned but has no approval row (e.g. added after review was submitted)
      const { review } = makePendingReview();
      // Remove the caller's approval from the list
      (review.approvals as InterviewReviewApproval[]).splice(0, 1);

      interviewReviewRepo.findOne!.mockResolvedValue(review);
      assignmentRepo.findOne!.mockResolvedValue({ ...callerAssignment });

      await expect(
        service.approveInterviewReview(20, true, recruiter),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException if review not in PENDING_APPROVAL', async () => {
      interviewReviewRepo.findOne!.mockResolvedValue({
        id: 20,
        application: mockApp,
        status: InterviewReviewStatus.DRAFT,
        approvals: [],
      } as unknown as InterviewReview);

      await expect(
        service.approveInterviewReview(20, true, recruiter),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException if review is already APPROVED', async () => {
      interviewReviewRepo.findOne!.mockResolvedValue({
        id: 20,
        application: mockApp,
        status: InterviewReviewStatus.APPROVED,
        approvals: [],
      } as unknown as InterviewReview);

      await expect(
        service.approveInterviewReview(20, true, recruiter),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException if review not found', async () => {
      interviewReviewRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.approveInterviewReview(20, true, recruiter),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if recruiter not assigned', async () => {
      const { review } = makePendingReview();
      interviewReviewRepo.findOne!.mockResolvedValue(review);
      assignmentRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.approveInterviewReview(20, true, recruiter),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows a previous approver to change vote to rejection (review resets to DRAFT)', async () => {
      // Caller already voted true; now they reject before others have voted
      const approvalForCaller = {
        id: 1,
        assignment: { ...callerAssignment },
        approved: true, // previously approved
        decidedAt: new Date(),
      } as InterviewReviewApproval;
      const approvalForOther = {
        id: 2,
        assignment: { ...otherAssignment },
        approved: null,
        decidedAt: null,
      } as InterviewReviewApproval;
      const review = {
        id: 20,
        application: mockApp,
        status: InterviewReviewStatus.PENDING_APPROVAL,
        approvals: [approvalForCaller, approvalForOther],
      } as unknown as InterviewReview;

      interviewReviewRepo.findOne!.mockResolvedValue(review);
      assignmentRepo.findOne!.mockResolvedValue({ ...callerAssignment });
      interviewReviewApprovalRepo.save!.mockResolvedValue({
        ...approvalForCaller,
        approved: false,
      });
      interviewReviewRepo.save!.mockImplementation((r) => Promise.resolve(r));
      interviewReviewApprovalRepo.delete!.mockResolvedValue(undefined);

      const result = await service.approveInterviewReview(20, false, recruiter);

      expect(result.status).toBe(InterviewReviewStatus.DRAFT);
      expect(interviewReviewApprovalRepo.delete).toHaveBeenCalledWith({
        review: { id: 20 },
      });
    });
  });
});
