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
import { ScreeningRubric } from '../../rubrics/entities/screening-rubric.entity';
import { InterviewCriteria } from '../../rubrics/entities/interview-criteria.entity';
import { InterviewReviewStatus } from '../../applications/enums/interview-review-status.enum';
import { ScreeningReviewStatus } from '../../applications/enums/screening-review-status.enum';
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
  let screeningRubricRepo: MockRepo<ScreeningRubric>;
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
    screeningRubricRepo = createMockRepo<ScreeningRubric>();
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
          provide: getRepositoryToken(ScreeningRubric),
          useValue: screeningRubricRepo,
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
    // round on the assignment matches application.round, no terminal decision → active
    const makeAssignment = (id: number, round: ApplicationRound) => ({
      id,
      round,
      application: {
        id: id * 10,
        round,
        finalDecision: null,
        applicant: { name: 'Jane Doe' },
      },
    });

    it('returns paginated data with total and totalPages', async () => {
      const assignment = makeAssignment(1, ApplicationRound.SCREENING);
      assignmentRepo.findAndCount!.mockResolvedValue([[assignment], 1]);
      assignmentRepo.find!.mockResolvedValue([assignment]);
      screeningReviewRepo.find!.mockResolvedValue([]);
      screeningReviewRepo.findOne!.mockResolvedValue(null);
      screeningReviewRepo.count!.mockResolvedValue(0);

      const result = await service.listAssignments(recruiter, 1, 20);

      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.data).toHaveLength(1);
    });

    it('includes applicantName, round, and reviewStatus in each item', async () => {
      const assignment = makeAssignment(1, ApplicationRound.SCREENING);
      assignmentRepo.findAndCount!.mockResolvedValue([[assignment], 1]);
      assignmentRepo.find!.mockResolvedValue([assignment]);
      screeningReviewRepo.find!.mockResolvedValue([]);
      screeningReviewRepo.findOne!.mockResolvedValue(null);
      screeningReviewRepo.count!.mockResolvedValue(0);

      const result = await service.listAssignments(recruiter, 1, 20);

      expect(result.data[0].application.applicantName).toBe('Jane Doe');
      expect(result.data[0].application.round).toBe(ApplicationRound.SCREENING);
      expect(result.data[0].reviewStatus).toBe('not_started');
    });

    it('excludes a screening assignment once its review is submitted', async () => {
      const assignment = makeAssignment(1, ApplicationRound.SCREENING);
      assignmentRepo.findAndCount!.mockResolvedValue([[assignment], 1]);
      // Batch-load returns a SUBMITTED review for this assignment → excluded from active
      screeningReviewRepo.find!.mockResolvedValue([
        {
          assignment: { id: 1 },
          status: ScreeningReviewStatus.SUBMITTED,
        } as unknown as ScreeningReview,
      ]);

      const result = await service.listAssignments(recruiter, 1, 20);

      expect(result.total).toBe(0);
      expect(result.data).toHaveLength(0);
    });

    it('keeps a screening assignment active when review is DRAFT', async () => {
      const assignment = makeAssignment(1, ApplicationRound.SCREENING);
      assignmentRepo.findAndCount!.mockResolvedValue([[assignment], 1]);
      // Batch-load returns a DRAFT review → assignment stays active
      screeningReviewRepo.find!.mockResolvedValue([
        {
          assignment: { id: 1 },
          status: ScreeningReviewStatus.DRAFT,
        } as unknown as ScreeningReview,
      ]);
      assignmentRepo.find!.mockResolvedValue([assignment]);
      screeningReviewRepo.count!.mockResolvedValue(0);

      const result = await service.listAssignments(recruiter, 1, 20);

      expect(result.total).toBe(1);
      expect(result.data[0].reviewStatus).toBe('draft');
    });

    it('returns reviewStatus "draft" for an in-progress interview review', async () => {
      const assignment = makeAssignment(
        1,
        ApplicationRound.TECHNICAL_INTERVIEW,
      );
      assignmentRepo.findAndCount!.mockResolvedValue([[assignment], 1]);
      screeningReviewRepo.find!.mockResolvedValue([]);
      // DRAFT review → assignment stays active
      interviewReviewRepo.findOne!.mockResolvedValue({
        id: 10,
        status: InterviewReviewStatus.DRAFT,
      } as unknown as InterviewReview);

      const result = await service.listAssignments(recruiter, 1, 20);

      expect(result.data[0].reviewStatus).toBe('draft');
    });

    it('excludes assignment when interview review is PENDING_APPROVAL', async () => {
      const assignment = makeAssignment(
        1,
        ApplicationRound.BEHAVIORAL_INTERVIEW,
      );
      assignmentRepo.findAndCount!.mockResolvedValue([[assignment], 1]);
      screeningReviewRepo.find!.mockResolvedValue([]);
      // Non-draft review → excluded from active
      interviewReviewRepo.findOne!.mockResolvedValue({
        id: 10,
        status: InterviewReviewStatus.PENDING_APPROVAL,
      } as unknown as InterviewReview);

      const result = await service.listAssignments(recruiter, 1, 20);

      expect(result.total).toBe(0);
      expect(result.data).toHaveLength(0);
    });

    it('excludes assignment when interview review is APPROVED', async () => {
      const assignment = makeAssignment(
        1,
        ApplicationRound.TECHNICAL_INTERVIEW,
      );
      assignmentRepo.findAndCount!.mockResolvedValue([[assignment], 1]);
      screeningReviewRepo.find!.mockResolvedValue([]);
      interviewReviewRepo.findOne!.mockResolvedValue({
        id: 10,
        status: InterviewReviewStatus.APPROVED,
      } as unknown as InterviewReview);

      const result = await service.listAssignments(recruiter, 1, 20);

      expect(result.total).toBe(0);
      expect(result.data).toHaveLength(0);
    });

    it('excludes assignment when app has a terminal decision (finalDecision not null)', async () => {
      const terminalAssignment = {
        id: 1,
        round: ApplicationRound.SCREENING,
        application: {
          id: 10,
          round: ApplicationRound.SCREENING,
          finalDecision: 'reject',
          applicant: { name: 'Jane Doe' },
        },
      };
      assignmentRepo.findAndCount!.mockResolvedValue([[terminalAssignment], 1]);
      screeningReviewRepo.find!.mockResolvedValue([]);

      const result = await service.listAssignments(recruiter, 1, 20);

      expect(result.total).toBe(0);
      expect(result.data).toHaveLength(0);
    });

    it('calculates totalPages correctly for multiple pages', async () => {
      // 25 active assignments, page size 10 → 3 pages; get page 2
      const assignments = Array.from({ length: 25 }, (_, i) =>
        makeAssignment(i + 1, ApplicationRound.SCREENING),
      );
      assignmentRepo.findAndCount!.mockResolvedValue([assignments, 25]);
      assignmentRepo.find!.mockResolvedValue([]);
      screeningReviewRepo.find!.mockResolvedValue([]);
      screeningReviewRepo.findOne!.mockResolvedValue(null);
      screeningReviewRepo.count!.mockResolvedValue(0);

      const result = await service.listAssignments(recruiter, 2, 10);

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
  // saveScreeningReview
  // ──────────────────────────────────────────────────────────────────────
  describe('saveScreeningReview', () => {
    const baseAssignment = {
      id: 10,
      application: { id: 5, round: ApplicationRound.SCREENING } as Application,
    } as Assignment;

    it('creates a DRAFT ScreeningReview and scores', async () => {
      const criteria = [{ id: 1 }, { id: 2 }] as ScreeningCriteria[];
      assignmentRepo.findOne!.mockResolvedValue({ ...baseAssignment });
      screeningReviewRepo.findOne!.mockResolvedValue(null);
      screeningCriteriaRepo.findBy!.mockResolvedValue(criteria);
      screeningReviewRepo.create!.mockImplementation((d) => ({ id: 99, ...d }));
      screeningReviewRepo.save!.mockImplementation((r) => Promise.resolve(r));
      screeningReviewScoreRepo.create!.mockImplementation((d) => d);
      screeningReviewScoreRepo.save!.mockResolvedValue([]);

      const result = await service.saveScreeningReview(
        {
          assignmentId: 10,
          scores: [
            { criteriaId: 1, score: 1 },
            { criteriaId: 2, score: 2 },
          ],
        },
        recruiter,
      );

      expect(screeningReviewRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: ScreeningReviewStatus.DRAFT }),
      );
      expect(screeningReviewScoreRepo.save).toHaveBeenCalled();
      expect(result).toHaveProperty('id');
    });

    it('updates draft: deletes old scores and saves new ones', async () => {
      const criteria = [{ id: 1 }] as ScreeningCriteria[];
      const existingDraft = {
        id: 88,
        status: ScreeningReviewStatus.DRAFT,
        scores: [],
      } as unknown as ScreeningReview;
      assignmentRepo.findOne!.mockResolvedValue({ ...baseAssignment });
      screeningReviewRepo.findOne!.mockResolvedValue(existingDraft);
      screeningCriteriaRepo.findBy!.mockResolvedValue(criteria);
      screeningReviewScoreRepo.delete!.mockResolvedValue(undefined);
      screeningReviewScoreRepo.create!.mockImplementation((d) => d);
      screeningReviewScoreRepo.save!.mockResolvedValue([]);

      const result = await service.saveScreeningReview(
        { assignmentId: 10, scores: [{ criteriaId: 1, score: 2 }] },
        recruiter,
      );

      expect(screeningReviewScoreRepo.delete).toHaveBeenCalledWith({
        review: { id: 88 },
      });
      expect(screeningReviewScoreRepo.save).toHaveBeenCalled();
      expect(result).toEqual({ id: 88 });
    });

    it('throws ConflictException if review is already SUBMITTED', async () => {
      assignmentRepo.findOne!.mockResolvedValue({ ...baseAssignment });
      screeningReviewRepo.findOne!.mockResolvedValue({
        id: 88,
        status: ScreeningReviewStatus.SUBMITTED,
        scores: [],
      } as unknown as ScreeningReview);

      await expect(
        service.saveScreeningReview(
          { assignmentId: 10, scores: [] },
          recruiter,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException if assignment not found', async () => {
      assignmentRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.saveScreeningReview(
          { assignmentId: 99, scores: [] },
          recruiter,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if a criteria ID does not exist', async () => {
      assignmentRepo.findOne!.mockResolvedValue({ ...baseAssignment });
      screeningReviewRepo.findOne!.mockResolvedValue(null);
      // Only 1 criteria found but 2 submitted
      screeningCriteriaRepo.findBy!.mockResolvedValue([
        { id: 1 },
      ] as ScreeningCriteria[]);

      await expect(
        service.saveScreeningReview(
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

    it('does NOT call checkScreeningCompletion (save does not finalize)', async () => {
      const criteria = [{ id: 1 }] as ScreeningCriteria[];
      assignmentRepo.findOne!.mockResolvedValue({ ...baseAssignment });
      screeningReviewRepo.findOne!.mockResolvedValue(null);
      screeningCriteriaRepo.findBy!.mockResolvedValue(criteria);
      screeningReviewRepo.create!.mockImplementation((d) => ({ id: 99, ...d }));
      screeningReviewRepo.save!.mockImplementation((r) => Promise.resolve(r));
      screeningReviewScoreRepo.create!.mockImplementation((d) => d);
      screeningReviewScoreRepo.save!.mockResolvedValue([]);

      await service.saveScreeningReview(
        { assignmentId: 10, scores: [{ criteriaId: 1, score: 1 }] },
        recruiter,
      );

      // checkScreeningCompletion calls assignmentRepo.find and screeningReviewRepo.count
      // but they should NOT be called since save draft skips completion check
      expect(applicationRepo.save).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // submitScreeningReview
  // ──────────────────────────────────────────────────────────────────────
  describe('submitScreeningReview', () => {
    const baseAssignment = {
      id: 10,
      recruiter: { id: 1 } as Recruiter,
      application: { id: 5, round: ApplicationRound.SCREENING } as Application,
    } as unknown as Assignment;

    const makeDraftReview = () =>
      ({
        id: 99,
        status: ScreeningReviewStatus.DRAFT,
        assignment: baseAssignment,
      } as unknown as ScreeningReview);

    it('sets status to SUBMITTED and calls checkScreeningCompletion', async () => {
      const review = makeDraftReview();
      screeningReviewRepo.findOne!.mockResolvedValue(review);
      screeningReviewRepo.save!.mockImplementation((r) => Promise.resolve(r));
      // checkScreeningCompletion
      assignmentRepo.find!.mockResolvedValue([baseAssignment]);
      screeningReviewRepo.count!.mockResolvedValue(0); // not all done yet

      const result = await service.submitScreeningReview(99, recruiter);

      expect(screeningReviewRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ScreeningReviewStatus.SUBMITTED }),
      );
      expect(result).toEqual({ id: 99 });
    });

    it('advances application to AWAITING_ADMIN when all assignments have submitted reviews', async () => {
      const review = makeDraftReview();
      screeningReviewRepo.findOne!.mockResolvedValue(review);
      screeningReviewRepo.save!.mockImplementation((r) => Promise.resolve(r));
      assignmentRepo.find!.mockResolvedValue([baseAssignment]);
      screeningReviewRepo.count!.mockResolvedValue(1); // all submitted

      const mockApp = {
        id: 5,
        roundStatus: RoundStatus.IN_PROGRESS,
      } as Application;
      applicationRepo.findOneByOrFail!.mockResolvedValue(mockApp);
      applicationRepo.save!.mockImplementation((r) => Promise.resolve(r));

      await service.submitScreeningReview(99, recruiter);

      expect(applicationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ roundStatus: RoundStatus.AWAITING_ADMIN }),
      );
    });

    it('does not advance application when some assignments still lack submitted reviews', async () => {
      const secondAssignment = { id: 11 } as Assignment;
      const review = makeDraftReview();
      screeningReviewRepo.findOne!.mockResolvedValue(review);
      screeningReviewRepo.save!.mockImplementation((r) => Promise.resolve(r));
      assignmentRepo.find!.mockResolvedValue([
        baseAssignment,
        secondAssignment,
      ]);
      screeningReviewRepo.count!.mockResolvedValue(1); // only 1 of 2

      await service.submitScreeningReview(99, recruiter);

      expect(applicationRepo.save).not.toHaveBeenCalled();
    });

    it('throws ConflictException if review is not in DRAFT state', async () => {
      screeningReviewRepo.findOne!.mockResolvedValue({
        id: 99,
        status: ScreeningReviewStatus.SUBMITTED,
        assignment: baseAssignment,
      } as unknown as ScreeningReview);

      await expect(
        service.submitScreeningReview(99, recruiter),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException if review not found', async () => {
      screeningReviewRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.submitScreeningReview(999, recruiter),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if recruiter does not own the assignment', async () => {
      const otherRecruiter = { id: 99 } as Recruiter;
      const otherAssignment = {
        id: 10,
        recruiter: otherRecruiter,
        application: {
          id: 5,
          round: ApplicationRound.SCREENING,
        } as Application,
      } as unknown as Assignment;
      screeningReviewRepo.findOne!.mockResolvedValue({
        id: 99,
        status: ScreeningReviewStatus.DRAFT,
        assignment: otherAssignment,
      } as unknown as ScreeningReview);

      await expect(
        service.submitScreeningReview(99, recruiter),
      ).rejects.toThrow(ForbiddenException);
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

  // ──────────────────────────────────────────────────────────────────────
  // getAssignmentDetail
  // ──────────────────────────────────────────────────────────────────────
  describe('getAssignmentDetail', () => {
    const mockAssignment = {
      id: 5,
      notes: 'some notes',
      application: {
        id: 10,
        round: ApplicationRound.SCREENING,
        roundStatus: RoundStatus.IN_PROGRESS,
        finalDecision: null,
        submittedAt: new Date(),
        applicant: {
          name: 'Alice Smith',
          email: 'alice@example.com',
          major: 'CS',
          academicYear: 'first',
        },
        rawGoogleForm: {
          whyC4C: 'I care',
          selfStartedProject: 'project',
          communityImpact: 'impact',
          teamConflict: 'conflict',
          otherExperiences: 'other',
        },
      },
    } as unknown as Assignment;

    it('throws NotFoundException when assignment does not belong to recruiter', async () => {
      assignmentRepo.findOne!.mockResolvedValue(null);
      await expect(service.getAssignmentDetail(99, recruiter)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns assignment detail with rubric criteria', async () => {
      assignmentRepo.findOne!.mockResolvedValue(mockAssignment);
      screeningReviewRepo.findOne!.mockResolvedValue(null);
      screeningRubricRepo.find!.mockResolvedValue([
        {
          id: 1,
          name: 'Rubric 1',
          criteria: [
            {
              id: 10,
              name: 'Skill',
              oneDescription: 'Meh',
              twoDescription: 'Nice',
              threeDescription: 'Amazing',
            },
          ],
        },
      ] as ScreeningRubric[]);

      const result = await service.getAssignmentDetail(5, recruiter);

      expect(result.assignmentId).toBe(5);
      expect(result.notes).toBe('some notes');
      expect(result.reviewStatus).toBe('not_started');
      expect(result.reviewId).toBeNull();
      expect(result.rubricCriteria).toHaveLength(1);
      expect(result.rubricCriteria[0].name).toBe('Skill');
    });

    it('returns reviewStatus "submitted" and reviewId when SUBMITTED review exists', async () => {
      assignmentRepo.findOne!.mockResolvedValue(mockAssignment);
      screeningReviewRepo.findOne!.mockResolvedValue({
        id: 7,
        status: ScreeningReviewStatus.SUBMITTED,
        scores: [],
      } as unknown as ScreeningReview);
      screeningRubricRepo.find!.mockResolvedValue([]);

      const result = await service.getAssignmentDetail(5, recruiter);

      expect(result.reviewStatus).toBe('submitted');
      expect(result.reviewId).toBe(7);
    });

    it('returns reviewStatus "draft" and reviewId when DRAFT review exists', async () => {
      assignmentRepo.findOne!.mockResolvedValue(mockAssignment);
      screeningReviewRepo.findOne!.mockResolvedValue({
        id: 42,
        status: ScreeningReviewStatus.DRAFT,
        scores: [],
      } as unknown as ScreeningReview);
      screeningRubricRepo.find!.mockResolvedValue([]);

      const result = await service.getAssignmentDetail(5, recruiter);

      expect(result.reviewStatus).toBe('draft');
      expect(result.reviewId).toBe(42);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // getCoReviewers
  // ──────────────────────────────────────────────────────────────────────
  describe('getCoReviewers', () => {
    const mockApp = { id: 5, round: ApplicationRound.SCREENING };

    const makeReviewerAssignment = (
      id: number,
      firstName: string,
      lastName: string,
    ) => ({
      id,
      recruiter: { id: id * 10, firstName, lastName },
    });

    // callerAssignment must include application relation (loaded by service)
    const makeCallerAssignment = (id: number) => ({
      id,
      round: ApplicationRound.SCREENING,
      application: mockApp,
    });

    it('throws NotFoundException when recruiter is not assigned to the application', async () => {
      assignmentRepo.findOne!.mockResolvedValue(null);

      await expect(service.getCoReviewers(42, recruiter)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns co-reviewer list when recruiter is assigned', async () => {
      assignmentRepo.findOne!.mockResolvedValue(makeCallerAssignment(1));
      assignmentRepo.find!.mockResolvedValue([
        makeReviewerAssignment(1, 'Alice', 'Smith'),
        makeReviewerAssignment(2, 'Bob', 'Jones'),
      ]);
      screeningReviewRepo.find!.mockResolvedValue([]);

      const result = await service.getCoReviewers(5, recruiter);

      expect(result).toHaveLength(2);
      expect(result[0].recruiterName).toBe('Alice Smith');
      expect(result[1].recruiterName).toBe('Bob Jones');
    });

    it('sets reviewStatus "submitted" for assignments with a SUBMITTED screening review', async () => {
      assignmentRepo.findOne!.mockResolvedValue(makeCallerAssignment(1));
      assignmentRepo.find!.mockResolvedValue([
        makeReviewerAssignment(1, 'Alice', 'Smith'),
        makeReviewerAssignment(2, 'Bob', 'Jones'),
      ]);
      screeningReviewRepo.find!.mockResolvedValue([
        {
          id: 99,
          assignment: { id: 1 },
          status: ScreeningReviewStatus.SUBMITTED,
        } as unknown as ScreeningReview,
      ]);

      const result = await service.getCoReviewers(5, recruiter);

      expect(result.find((r) => r.assignmentId === 1)?.reviewStatus).toBe(
        'submitted',
      );
      expect(result.find((r) => r.assignmentId === 2)?.reviewStatus).toBe(
        'not_started',
      );
    });

    it('sets reviewStatus "draft" for assignments with a DRAFT screening review', async () => {
      assignmentRepo.findOne!.mockResolvedValue(makeCallerAssignment(1));
      assignmentRepo.find!.mockResolvedValue([
        makeReviewerAssignment(1, 'Alice', 'Smith'),
        makeReviewerAssignment(2, 'Bob', 'Jones'),
      ]);
      screeningReviewRepo.find!.mockResolvedValue([
        {
          id: 99,
          assignment: { id: 1 },
          status: ScreeningReviewStatus.DRAFT,
        } as unknown as ScreeningReview,
      ]);

      const result = await service.getCoReviewers(5, recruiter);

      expect(result.find((r) => r.assignmentId === 1)?.reviewStatus).toBe(
        'draft',
      );
      expect(result.find((r) => r.assignmentId === 2)?.reviewStatus).toBe(
        'not_started',
      );
    });

    it('returns empty array when no assignments exist for the application (caller removed race condition)', async () => {
      assignmentRepo.findOne!.mockResolvedValue(makeCallerAssignment(1));
      assignmentRepo.find!.mockResolvedValue([]);
      screeningReviewRepo.find!.mockResolvedValue([]);

      const result = await service.getCoReviewers(5, recruiter);

      expect(result).toHaveLength(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // updateNotes
  // ──────────────────────────────────────────────────────────────────────
  describe('updateNotes', () => {
    it('throws NotFoundException when assignment does not belong to recruiter', async () => {
      assignmentRepo.findOne!.mockResolvedValue(null);
      await expect(
        service.updateNotes(99, 'some notes', recruiter),
      ).rejects.toThrow(NotFoundException);
    });

    it('saves notes and returns updated assignment id and notes', async () => {
      const mockAssignment = { id: 5, notes: null } as Assignment;
      assignmentRepo.findOne!.mockResolvedValue(mockAssignment);
      assignmentRepo.save!.mockResolvedValue({
        ...mockAssignment,
        notes: 'new notes',
      });

      const result = await service.updateNotes(5, 'new notes', recruiter);

      expect(assignmentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ notes: 'new notes' }),
      );
      expect(result).toEqual({ assignmentId: 5, notes: 'new notes' });
    });

    it('saves null notes to clear them', async () => {
      const mockAssignment = { id: 5, notes: 'old notes' } as Assignment;
      assignmentRepo.findOne!.mockResolvedValue(mockAssignment);
      assignmentRepo.save!.mockResolvedValue({
        ...mockAssignment,
        notes: null,
      });

      const result = await service.updateNotes(5, null, recruiter);

      expect(assignmentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ notes: null }),
      );
      expect(result).toEqual({ assignmentId: 5, notes: null });
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // listCompletedAssignments
  // ──────────────────────────────────────────────────────────────────────
  describe('listCompletedAssignments', () => {
    // round on assignment differs from application.round → completed
    const makeCompletedAssignment = (id: number) => ({
      id,
      round: ApplicationRound.SCREENING, // old round
      application: {
        id: id * 10,
        round: ApplicationRound.TECHNICAL_INTERVIEW, // current round moved on
        finalDecision: null,
        applicant: { name: 'Jane Doe' },
      },
    });

    const makeActiveAssignment = (id: number) => ({
      id,
      round: ApplicationRound.SCREENING,
      application: {
        id: id * 10,
        round: ApplicationRound.SCREENING, // same → still active
        finalDecision: null,
        applicant: { name: 'John Smith' },
      },
    });

    it('returns only past-round assignments', async () => {
      const completed = makeCompletedAssignment(1);
      const active = makeActiveAssignment(2);
      assignmentRepo.findAndCount!.mockResolvedValue([[completed, active], 2]);
      screeningReviewRepo.find!.mockResolvedValue([]);
      screeningReviewRepo.findOne!.mockResolvedValue(null);

      const result = await service.listCompletedAssignments(recruiter, 1, 20);

      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].assignmentId).toBe(1);
    });

    it('returns reviewStatus "submitted" when screening review is SUBMITTED', async () => {
      const completed = makeCompletedAssignment(1);
      assignmentRepo.findAndCount!.mockResolvedValue([[completed], 1]);
      screeningReviewRepo.find!.mockResolvedValue([
        {
          assignment: { id: 1 },
          status: ScreeningReviewStatus.SUBMITTED,
        } as unknown as ScreeningReview,
      ]);

      const result = await service.listCompletedAssignments(recruiter, 1, 20);

      expect(result.data[0].reviewStatus).toBe('submitted');
    });

    it('returns reviewStatus "not_started" when no review exists', async () => {
      const completed = makeCompletedAssignment(1);
      assignmentRepo.findAndCount!.mockResolvedValue([[completed], 1]);
      screeningReviewRepo.find!.mockResolvedValue([]);

      const result = await service.listCompletedAssignments(recruiter, 1, 20);

      expect(result.data[0].reviewStatus).toBe('not_started');
    });

    it('returns empty data when no completed assignments exist', async () => {
      const active = makeActiveAssignment(1);
      assignmentRepo.findAndCount!.mockResolvedValue([[active], 1]);
      screeningReviewRepo.find!.mockResolvedValue([]);

      const result = await service.listCompletedAssignments(recruiter, 1, 20);

      expect(result.total).toBe(0);
      expect(result.data).toHaveLength(0);
    });

    it('paginates correctly', async () => {
      const assignments = Array.from({ length: 3 }, (_, i) =>
        makeCompletedAssignment(i + 1),
      );
      assignmentRepo.findAndCount!.mockResolvedValue([assignments, 3]);
      screeningReviewRepo.find!.mockResolvedValue([]);
      screeningReviewRepo.findOne!.mockResolvedValue(null);

      const result = await service.listCompletedAssignments(recruiter, 2, 2);

      expect(result.total).toBe(3);
      expect(result.totalPages).toBe(2);
      expect(result.data).toHaveLength(1); // page 2 of 2, only 1 item left
    });

    it('includes assignment in completed when SUBMITTED review exists (same round, no terminal)', async () => {
      const assignmentWithReview = {
        id: 5,
        round: ApplicationRound.SCREENING,
        application: {
          id: 50,
          round: ApplicationRound.SCREENING, // same round
          finalDecision: null,
          applicant: { name: 'Sam Lee' },
        },
      };
      assignmentRepo.findAndCount!.mockResolvedValue([
        [assignmentWithReview],
        1,
      ]);
      // Batch-load returns a SUBMITTED review for assignment 5
      screeningReviewRepo.find!.mockResolvedValue([
        {
          assignment: { id: 5 },
          status: ScreeningReviewStatus.SUBMITTED,
        } as unknown as ScreeningReview,
      ]);

      const result = await service.listCompletedAssignments(recruiter, 1, 20);

      expect(result.total).toBe(1);
      expect(result.data[0].assignmentId).toBe(5);
      expect(result.data[0].reviewStatus).toBe('submitted');
    });

    it('keeps assignment active (not completed) when only DRAFT review exists', async () => {
      const assignmentWithDraft = {
        id: 5,
        round: ApplicationRound.SCREENING,
        application: {
          id: 50,
          round: ApplicationRound.SCREENING,
          finalDecision: null,
          applicant: { name: 'Sam Lee' },
        },
      };
      assignmentRepo.findAndCount!.mockResolvedValue([
        [assignmentWithDraft],
        1,
      ]);
      // Batch-load returns only a DRAFT review → should NOT be in completed
      screeningReviewRepo.find!.mockResolvedValue([
        {
          assignment: { id: 5 },
          status: ScreeningReviewStatus.DRAFT,
        } as unknown as ScreeningReview,
      ]);

      const result = await service.listCompletedAssignments(recruiter, 1, 20);

      expect(result.total).toBe(0);
      expect(result.data).toHaveLength(0);
    });

    it('includes assignment in completed when app has terminal decision', async () => {
      const terminalAssignment = {
        id: 6,
        round: ApplicationRound.SCREENING,
        application: {
          id: 60,
          round: ApplicationRound.SCREENING, // same round
          finalDecision: 'reject',
          applicant: { name: 'Pat Kim' },
        },
      };
      assignmentRepo.findAndCount!.mockResolvedValue([[terminalAssignment], 1]);
      screeningReviewRepo.find!.mockResolvedValue([]);
      screeningReviewRepo.findOne!.mockResolvedValue(null);

      const result = await service.listCompletedAssignments(recruiter, 1, 20);

      expect(result.total).toBe(1);
      expect(result.data[0].assignmentId).toBe(6);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // getCompletedAssignmentDetail
  // ──────────────────────────────────────────────────────────────────────
  describe('getCompletedAssignmentDetail', () => {
    const makeAssignment = (
      overrides: Partial<{
        id: number;
        recruiter: Partial<Recruiter>;
        round: ApplicationRound;
        appRound: ApplicationRound;
      }> = {},
    ) => {
      const {
        id = 10,
        recruiter: rec = { id: 1, firstName: 'Alice', lastName: 'Smith' },
        round = ApplicationRound.SCREENING,
        appRound = ApplicationRound.TECHNICAL_INTERVIEW,
      } = overrides;
      return {
        id,
        round,
        notes: 'some notes',
        assignedAt: new Date('2024-01-01'),
        recruiter: rec,
        application: {
          id: 100,
          round: appRound,
          roundStatus: RoundStatus.PENDING,
          finalDecision: null,
          applicant: {
            id: 5,
            name: 'Jane Doe',
            email: 'jane@example.com',
            major: 'CS',
            academicYear: 'Junior',
          },
          rawGoogleForm: { whyC4C: 'because' },
        },
      };
    };

    it('throws NotFoundException when assignment not found', async () => {
      assignmentRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.getCompletedAssignmentDetail(99, recruiter),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when assignment belongs to a different recruiter', async () => {
      const assignment = makeAssignment({ recruiter: { id: 999 } });
      assignmentRepo.findOne!.mockResolvedValue(
        assignment as unknown as Assignment,
      );

      await expect(
        service.getCompletedAssignmentDetail(10, recruiter),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when assignment is still active (same round, no review, no terminal)', async () => {
      // round matches appRound, no review, no terminal decision → still active
      const assignment = makeAssignment({
        round: ApplicationRound.SCREENING,
        appRound: ApplicationRound.SCREENING,
      });
      assignmentRepo.findOne!.mockResolvedValue(
        assignment as unknown as Assignment,
      );
      // No review submitted
      screeningReviewRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.getCompletedAssignmentDetail(10, recruiter),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when only a DRAFT review exists (still active)', async () => {
      const assignment = makeAssignment({
        round: ApplicationRound.SCREENING,
        appRound: ApplicationRound.SCREENING,
      });
      assignmentRepo.findOne!.mockResolvedValue(
        assignment as unknown as Assignment,
      );
      screeningReviewRepo.findOne!.mockResolvedValue({
        id: 7,
        status: ScreeningReviewStatus.DRAFT,
        scores: [],
      } as unknown as ScreeningReview);

      await expect(
        service.getCompletedAssignmentDetail(10, recruiter),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns detail when SUBMITTED review exists (same round counts as completed)', async () => {
      // Same round, but review was SUBMITTED → allowed to view
      const assignment = makeAssignment({
        round: ApplicationRound.SCREENING,
        appRound: ApplicationRound.SCREENING,
      });
      assignmentRepo.findOne!.mockResolvedValue(
        assignment as unknown as Assignment,
      );
      screeningReviewRepo.findOne!.mockResolvedValue({
        id: 7,
        status: ScreeningReviewStatus.SUBMITTED,
        scores: [],
      } as unknown as ScreeningReview);

      const result = await service.getCompletedAssignmentDetail(10, recruiter);

      expect(result.reviewStatus).toBe('submitted');
    });

    it('returns detail when app has terminal decision (same round counts as completed)', async () => {
      const assignment = makeAssignment({
        round: ApplicationRound.SCREENING,
        appRound: ApplicationRound.SCREENING,
      });
      // Override finalDecision to non-null
      (assignment.application as Record<string, unknown>).finalDecision =
        'reject';
      assignmentRepo.findOne!.mockResolvedValue(
        assignment as unknown as Assignment,
      );
      screeningReviewRepo.findOne!.mockResolvedValue(null);

      const result = await service.getCompletedAssignmentDetail(10, recruiter);

      expect(result.assignmentId).toBe(10);
    });

    it('returns detail with rubricCriteria when SUBMITTED review exists (round advanced)', async () => {
      const assignment = makeAssignment();
      assignmentRepo.findOne!.mockResolvedValue(
        assignment as unknown as Assignment,
      );
      screeningReviewRepo.findOne!.mockResolvedValue({
        id: 7,
        status: ScreeningReviewStatus.SUBMITTED,
        scores: [
          {
            score: 2,
            criteria: {
              id: 1,
              name: 'Criterion A',
              oneDescription: 'one',
              twoDescription: 'two',
              threeDescription: 'three',
            },
          },
        ],
      } as unknown as ScreeningReview);

      const result = await service.getCompletedAssignmentDetail(10, recruiter);

      expect(result.reviewStatus).toBe('submitted');
      expect(result.rubricCriteria).toHaveLength(1);
      expect(result.rubricCriteria[0].score).toBe(2);
      expect(result.application.applicant.name).toBe('Jane Doe');
    });

    it('returns detail with empty rubricCriteria when no review submitted (round advanced)', async () => {
      const assignment = makeAssignment();
      assignmentRepo.findOne!.mockResolvedValue(
        assignment as unknown as Assignment,
      );
      screeningReviewRepo.findOne!.mockResolvedValue(null);

      const result = await service.getCompletedAssignmentDetail(10, recruiter);

      expect(result.reviewStatus).toBe('not_started');
      expect(result.rubricCriteria).toHaveLength(0);
    });
  });
});
