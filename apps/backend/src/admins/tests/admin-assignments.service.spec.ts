import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';

import { AdminAssignmentsService } from '../admin-assignments.service';
import { Application } from '../../applications/entities/application.entity';
import { Assignment } from '../../applications/entities/assignment.entity';
import { ScreeningReview } from '../../applications/entities/screening-review.entity';
import { ScreeningReviewScore } from '../../applications/entities/screening-review-score.entity';
import { InterviewReview } from '../../applications/entities/interview-review.entity';
import { ApplicationRound } from '../../applications/enums/application-round.enum';
import { InterviewReviewStatus } from '../../applications/enums/interview-review-status.enum';
import { RoundStatus } from '../../applications/enums/round-status.enum';
import { Recruiter } from '../../recruiters/entities/recruiter.entity';
import { AccountStatus } from '../../users/status';

describe('AdminAssignmentsService', () => {
  let service: AdminAssignmentsService;
  let applicationRepo: jest.Mocked<Repository<Application>>;
  let assignmentRepo: jest.Mocked<Repository<Assignment>>;
  let recruiterRepo: jest.Mocked<Repository<Recruiter>>;
  let screeningReviewRepo: jest.Mocked<Repository<ScreeningReview>>;
  let screeningReviewScoreRepo: jest.Mocked<Repository<ScreeningReviewScore>>;
  let interviewReviewRepo: jest.Mocked<Repository<InterviewReview>>;

  beforeEach(async () => {
    const mockApplicationRepo = {
      find: jest.fn(),
      findBy: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    };
    const mockAssignmentRepo = {
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
      find: jest.fn().mockResolvedValue([]),
    };
    const mockRecruiterRepo = {
      findBy: jest.fn(),
    };
    const mockScreeningReviewRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockResolvedValue({}),
    };
    const mockScreeningReviewScoreRepo = {
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockResolvedValue([]),
    };
    const mockInterviewReviewRepo = {
      find: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAssignmentsService,
        {
          provide: getRepositoryToken(Application),
          useValue: mockApplicationRepo,
        },
        {
          provide: getRepositoryToken(Assignment),
          useValue: mockAssignmentRepo,
        },
        { provide: getRepositoryToken(Recruiter), useValue: mockRecruiterRepo },
        {
          provide: getRepositoryToken(ScreeningReview),
          useValue: mockScreeningReviewRepo,
        },
        {
          provide: getRepositoryToken(ScreeningReviewScore),
          useValue: mockScreeningReviewScoreRepo,
        },
        {
          provide: getRepositoryToken(InterviewReview),
          useValue: mockInterviewReviewRepo,
        },
      ],
    }).compile();

    service = module.get<AdminAssignmentsService>(AdminAssignmentsService);
    applicationRepo = module.get(getRepositoryToken(Application));
    assignmentRepo = module.get(getRepositoryToken(Assignment));
    recruiterRepo = module.get(getRepositoryToken(Recruiter));
    screeningReviewRepo = module.get(getRepositoryToken(ScreeningReview));
    screeningReviewScoreRepo = module.get(
      getRepositoryToken(ScreeningReviewScore),
    );
    interviewReviewRepo = module.get(getRepositoryToken(InterviewReview));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listApplicationsByRound', () => {
    const mockApps = [
      {
        id: 1,
        round: ApplicationRound.SCREENING,
        roundStatus: RoundStatus.PENDING,
        applicant: { firstName: 'Alice', lastName: 'Smith' },
      },
      {
        id: 2,
        round: ApplicationRound.SCREENING,
        roundStatus: RoundStatus.IN_PROGRESS,
        applicant: { firstName: 'Bob', lastName: 'Jones' },
      },
    ] as Application[];

    it('returns all applications when no round is specified', async () => {
      applicationRepo.find.mockResolvedValue(mockApps);

      const result = await service.listApplicationsByRound();

      expect(applicationRepo.find).toHaveBeenCalledWith({
        where: {},
        relations: ['applicant'],
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 1,
        round: ApplicationRound.SCREENING,
        roundStatus: RoundStatus.PENDING,
        applicant: { firstName: 'Alice', lastName: 'Smith' },
      });
    });

    it('filters applications by round when round is provided', async () => {
      applicationRepo.find.mockResolvedValue([mockApps[0]]);

      const result = await service.listApplicationsByRound(
        ApplicationRound.SCREENING,
      );

      expect(applicationRepo.find).toHaveBeenCalledWith({
        where: { round: ApplicationRound.SCREENING },
        relations: ['applicant'],
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('listActiveRecruiters', () => {
    it('returns only ACTIVATED recruiters mapped to id/name', async () => {
      const recruiters = [
        {
          id: 1,
          firstName: 'Carol',
          lastName: 'White',
          accountStatus: AccountStatus.ACTIVATED,
        },
        {
          id: 2,
          firstName: 'Dave',
          lastName: 'Brown',
          accountStatus: AccountStatus.ACTIVATED,
        },
      ] as Recruiter[];
      recruiterRepo.findBy.mockResolvedValue(recruiters);

      const result = await service.listActiveRecruiters();

      expect(recruiterRepo.findBy).toHaveBeenCalledWith({
        accountStatus: AccountStatus.ACTIVATED,
      });
      expect(result).toEqual([
        { id: 1, firstName: 'Carol', lastName: 'White' },
        { id: 2, firstName: 'Dave', lastName: 'Brown' },
      ]);
    });
  });

  describe('assignRecruiters', () => {
    it('throws BadRequestException when applicationIds is empty', async () => {
      await expect(service.assignRecruiters([], [1, 2], 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when recruiterIds is empty', async () => {
      await expect(service.assignRecruiters([1], [], 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when recruitersPerApp is less than 1', async () => {
      await expect(service.assignRecruiters([1], [1, 2], 0)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when recruitersPerApp exceeds recruiterIds length', async () => {
      await expect(service.assignRecruiters([1], [1], 2)).rejects.toThrow(
        new BadRequestException('Not enough recruiters selected'),
      );
    });

    it('throws NotFoundException when an application ID is invalid', async () => {
      const recruiters = [
        { id: 1, firstName: 'Carol', lastName: 'White' },
        { id: 2, firstName: 'Dave', lastName: 'Brown' },
      ] as Recruiter[];
      recruiterRepo.findBy.mockResolvedValue(recruiters);
      applicationRepo.findBy.mockResolvedValue([]);

      await expect(service.assignRecruiters([99], [1, 2], 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when a recruiter ID is invalid', async () => {
      recruiterRepo.findBy.mockResolvedValue([]);

      await expect(service.assignRecruiters([1], [99], 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deletes existing assignments before creating new ones (screening round)', async () => {
      const recruiters = [
        { id: 1, firstName: 'Carol', lastName: 'White' },
      ] as Recruiter[];
      const applications = [
        { id: 10, round: ApplicationRound.SCREENING },
      ] as Application[];

      recruiterRepo.findBy.mockResolvedValue(recruiters);
      applicationRepo.findBy.mockResolvedValue(applications);
      assignmentRepo.create.mockImplementation((data) => data as Assignment);
      assignmentRepo.save.mockResolvedValue({} as Assignment);

      await service.assignRecruiters([10], [1], 1);

      expect(assignmentRepo.delete).toHaveBeenCalledWith({
        application: expect.anything(),
      });
    });

    it('does NOT delete interview reviews when reassigning a screening-round application', async () => {
      const recruiters = [{ id: 1 }] as Recruiter[];
      const applications = [
        { id: 10, round: ApplicationRound.SCREENING },
      ] as Application[];

      recruiterRepo.findBy.mockResolvedValue(recruiters);
      applicationRepo.findBy.mockResolvedValue(applications);
      assignmentRepo.create.mockImplementation((data) => data as Assignment);
      assignmentRepo.save.mockResolvedValue({} as Assignment);

      await service.assignRecruiters([10], [1], 1);

      expect(interviewReviewRepo.delete).not.toHaveBeenCalled();
    });

    it('deletes only the current-round interview review when reassigning an interview-round application', async () => {
      const recruiters = [{ id: 1 }] as Recruiter[];
      const applications = [
        { id: 10, round: ApplicationRound.TECHNICAL_INTERVIEW },
      ] as Application[];

      recruiterRepo.findBy.mockResolvedValue(recruiters);
      applicationRepo.findBy.mockResolvedValue(applications);

      // Conflict check returns no blocking reviews; deletion check finds a draft to remove
      interviewReviewRepo.find
        .mockResolvedValueOnce([]) // conflict check (no PENDING_APPROVAL/APPROVED)
        .mockResolvedValueOnce([{ id: 5 }] as unknown as InterviewReview[]); // deletion check finds draft

      assignmentRepo.create.mockImplementation((data) => data as Assignment);
      assignmentRepo.save.mockResolvedValue({} as Assignment);

      await service.assignRecruiters([10], [1], 1);

      expect(interviewReviewRepo.delete).toHaveBeenCalledWith({
        id: expect.anything(),
      });
    });

    it('sets roundStatus to IN_PROGRESS after creating assignments', async () => {
      const recruiters = [
        { id: 1, firstName: 'Carol', lastName: 'White' },
      ] as Recruiter[];
      const applications = [
        { id: 10, round: ApplicationRound.SCREENING },
      ] as Application[];

      recruiterRepo.findBy.mockResolvedValue(recruiters);
      applicationRepo.findBy.mockResolvedValue(applications);
      assignmentRepo.create.mockImplementation((data) => data as Assignment);
      assignmentRepo.save.mockResolvedValue({} as Assignment);

      await service.assignRecruiters([10], [1], 1);

      expect(applicationRepo.update).toHaveBeenCalledWith(
        { id: expect.anything() },
        { roundStatus: RoundStatus.IN_PROGRESS },
      );
    });

    it('creates correct assignments with round-robin distribution', async () => {
      const recruiters = [
        { id: 1, firstName: 'Carol', lastName: 'White' },
        { id: 2, firstName: 'Dave', lastName: 'Brown' },
        { id: 3, firstName: 'Eve', lastName: 'Green' },
      ] as Recruiter[];
      const applications = [
        { id: 10, round: ApplicationRound.SCREENING },
        { id: 11, round: ApplicationRound.SCREENING },
      ] as Application[];

      recruiterRepo.findBy.mockResolvedValue(recruiters);
      applicationRepo.findBy.mockResolvedValue(applications);
      assignmentRepo.create.mockImplementation((data) => data as Assignment);
      assignmentRepo.save.mockResolvedValue({} as Assignment);

      const result = await service.assignRecruiters([10, 11], [1, 2, 3], 2);

      expect(assignmentRepo.create).toHaveBeenCalledTimes(4);
      expect(assignmentRepo.save).toHaveBeenCalledTimes(4);
      expect(result).toEqual({ assigned: 4 });
    });

    it('assigns minimum: 1 recruiter to 1 application', async () => {
      const recruiters = [{ id: 1 }] as Recruiter[];
      const applications = [
        { id: 10, round: ApplicationRound.SCREENING },
      ] as Application[];

      recruiterRepo.findBy.mockResolvedValue(recruiters);
      applicationRepo.findBy.mockResolvedValue(applications);
      assignmentRepo.create.mockImplementation((data) => data as Assignment);
      assignmentRepo.save.mockResolvedValue({} as Assignment);

      const result = await service.assignRecruiters([10], [1], 1);

      expect(result).toEqual({ assigned: 1 });
      expect(assignmentRepo.create).toHaveBeenCalledTimes(1);
    });

    it('reassigning same recruiters is idempotent (deletes and recreates)', async () => {
      const recruiters = [{ id: 1 }, { id: 2 }] as Recruiter[];
      const applications = [
        { id: 10, round: ApplicationRound.SCREENING },
      ] as Application[];
      recruiterRepo.findBy.mockResolvedValue(recruiters);
      applicationRepo.findBy.mockResolvedValue(applications);
      assignmentRepo.create.mockImplementation((data) => data as Assignment);
      assignmentRepo.save.mockResolvedValue({} as Assignment);

      const result = await service.assignRecruiters([10], [1, 2], 2);

      expect(assignmentRepo.delete).toHaveBeenCalled();
      expect(result).toEqual({ assigned: 2 });
    });

    it('reassigning to fewer recruiters reduces assignment count', async () => {
      const recruiters = [{ id: 1 }] as Recruiter[];
      const applications = [
        { id: 10, round: ApplicationRound.SCREENING },
      ] as Application[];
      recruiterRepo.findBy.mockResolvedValue(recruiters);
      applicationRepo.findBy.mockResolvedValue(applications);
      assignmentRepo.create.mockImplementation((data) => data as Assignment);
      assignmentRepo.save.mockResolvedValue({} as Assignment);

      const result = await service.assignRecruiters([10], [1], 1);

      expect(result).toEqual({ assigned: 1 });
    });

    it('blocks the entire batch when any screening-round application has a conflict', async () => {
      const recruiters = [{ id: 1 }] as Recruiter[];
      const applications = [
        { id: 10, round: ApplicationRound.SCREENING },
        { id: 11, round: ApplicationRound.SCREENING },
      ] as Application[];
      recruiterRepo.findBy.mockResolvedValue(recruiters);
      applicationRepo.findBy.mockResolvedValue(applications);

      const assignment10 = {
        id: 1,
        application: {
          id: 10,
          applicant: { firstName: 'Alice', lastName: 'Smith' },
        },
      } as unknown as Assignment;
      const assignment11 = {
        id: 2,
        application: {
          id: 11,
          applicant: { firstName: 'Bob', lastName: 'Jones' },
        },
      } as unknown as Assignment;
      assignmentRepo.find.mockResolvedValue([assignment10, assignment11]);

      // Only app 10 has a submitted screening review
      screeningReviewRepo.find.mockResolvedValue([
        { assignment: { id: 1 } } as unknown as ScreeningReview,
      ]);

      await expect(service.assignRecruiters([10, 11], [1], 1)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // Re-assignment conflict protection — screening round
  // ──────────────────────────────────────────────────────────────────────
  describe('re-assignment protection (screening round)', () => {
    const recruiters = [{ id: 1 }] as Recruiter[];
    const screeningApp = {
      id: 10,
      round: ApplicationRound.SCREENING,
      applicant: { firstName: 'Alice', lastName: 'Smith' },
    } as unknown as Application;

    const assignment10 = {
      id: 1,
      application: {
        id: 10,
        applicant: { firstName: 'Alice', lastName: 'Smith' },
      },
    } as unknown as Assignment;

    function setupScreeningApp() {
      recruiterRepo.findBy.mockResolvedValue(recruiters);
      applicationRepo.findBy.mockResolvedValue([screeningApp]);
      assignmentRepo.find.mockResolvedValue([assignment10]);
    }

    it('throws ConflictException with blockType "submitted" when a ScreeningReview exists', async () => {
      setupScreeningApp();

      screeningReviewRepo.find.mockResolvedValue([
        { assignment: { id: 1 } } as unknown as ScreeningReview,
      ]);

      const err = await service.assignRecruiters([10], [1], 1).catch((e) => e);
      expect(err).toBeInstanceOf(ConflictException);
      expect((err as ConflictException).getResponse()).toMatchObject({
        blockType: 'submitted',
        conflictingApps: [{ id: 10, applicantName: 'Alice Smith' }],
      });
    });

    it('proceeds without error when no screening reviews exist', async () => {
      setupScreeningApp();

      assignmentRepo.create.mockImplementation((d) => d as Assignment);
      assignmentRepo.save.mockResolvedValue({} as Assignment);
      // Defaults: screeningReviewRepo.find → [], interviewReviewRepo.find → []

      const result = await service.assignRecruiters([10], [1], 1);
      expect(result).toEqual({ assigned: 1 });
    });

    it('screening review conflict blocks even when an interview review is also a DRAFT', async () => {
      setupScreeningApp();

      screeningReviewRepo.find.mockResolvedValue([
        { assignment: { id: 1 } } as unknown as ScreeningReview,
      ]);

      const err = await service.assignRecruiters([10], [1], 1).catch((e) => e);
      expect((err as ConflictException).getResponse()).toMatchObject({
        blockType: 'submitted',
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // Re-assignment conflict protection — interview round
  // ──────────────────────────────────────────────────────────────────────
  describe('re-assignment protection (interview round)', () => {
    const recruiters = [{ id: 1 }] as Recruiter[];
    const interviewApp = {
      id: 10,
      round: ApplicationRound.TECHNICAL_INTERVIEW,
      applicant: { firstName: 'Alice', lastName: 'Smith' },
    } as unknown as Application;

    function setupInterviewApp() {
      recruiterRepo.findBy.mockResolvedValue(recruiters);
      applicationRepo.findBy.mockResolvedValue([interviewApp]);
    }

    it('is NOT blocked by screening reviews from a previously completed round', async () => {
      setupInterviewApp();

      // interviewReviewRepo.find: no blocking reviews (conflict check), then no draft to delete
      interviewReviewRepo.find.mockResolvedValue([]);
      assignmentRepo.create.mockImplementation((d) => d as Assignment);
      assignmentRepo.save.mockResolvedValue({} as Assignment);

      // screeningReviewRepo.find would fire in collectScreeningReviews — return empty
      screeningReviewRepo.find.mockResolvedValue([]);

      const result = await service.assignRecruiters([10], [1], 1);
      expect(result).toEqual({ assigned: 1 });
    });

    it('throws ConflictException with blockType "in_progress" when InterviewReview is PENDING_APPROVAL', async () => {
      setupInterviewApp();

      interviewReviewRepo.find.mockResolvedValue([
        {
          application: {
            id: 10,
            applicant: { firstName: 'Alice', lastName: 'Smith' },
          },
          status: InterviewReviewStatus.PENDING_APPROVAL,
        } as unknown as InterviewReview,
      ]);

      const err = await service.assignRecruiters([10], [1], 1).catch((e) => e);
      expect(err).toBeInstanceOf(ConflictException);
      expect((err as ConflictException).getResponse()).toMatchObject({
        blockType: 'in_progress',
        conflictingApps: [{ id: 10, applicantName: 'Alice Smith' }],
      });
    });

    it('throws ConflictException with blockType "in_progress" when InterviewReview is APPROVED', async () => {
      setupInterviewApp();

      interviewReviewRepo.find.mockResolvedValue([
        {
          application: {
            id: 10,
            applicant: { firstName: 'Alice', lastName: 'Smith' },
          },
          status: InterviewReviewStatus.APPROVED,
        } as unknown as InterviewReview,
      ]);

      await expect(service.assignRecruiters([10], [1], 1)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // force=true behaviour
  // ──────────────────────────────────────────────────────────────────────
  describe('force=true behaviour', () => {
    const recruiters = [{ id: 1 }] as Recruiter[];

    function setupScreeningApp() {
      const app = [
        { id: 10, round: ApplicationRound.SCREENING },
      ] as Application[];
      recruiterRepo.findBy.mockResolvedValue(recruiters);
      applicationRepo.findBy.mockResolvedValue(app);
      assignmentRepo.find.mockResolvedValue([]);
      assignmentRepo.create.mockImplementation((d) => d as Assignment);
      assignmentRepo.save.mockResolvedValue({} as Assignment);
    }

    it('bypasses conflict check and proceeds', async () => {
      setupScreeningApp();

      const result = await service.assignRecruiters([10], [1], 1, true);

      // checkReviewConflicts is skipped — these repos should not be queried for conflict
      expect(screeningReviewRepo.find).not.toHaveBeenCalled();
      expect(result).toEqual({ assigned: 1 });
    });

    it('does not call interviewReviewRepo when force=true on a screening-round application', async () => {
      setupScreeningApp();

      await service.assignRecruiters([10], [1], 1, true);

      expect(interviewReviewRepo.find).not.toHaveBeenCalled();
      expect(interviewReviewRepo.delete).not.toHaveBeenCalled();
    });

    it('resets roundStatus to IN_PROGRESS even if application was AWAITING_ADMIN', async () => {
      setupScreeningApp();

      await service.assignRecruiters([10], [1], 1, true);

      expect(applicationRepo.update).toHaveBeenCalledWith(
        { id: expect.anything() },
        { roundStatus: RoundStatus.IN_PROGRESS },
      );
    });

    it('deletes current-round interview review before assignments when force=true on interview app (order matters for FK cascade)', async () => {
      const interviewApps = [
        { id: 10, round: ApplicationRound.TECHNICAL_INTERVIEW },
      ] as Application[];
      recruiterRepo.findBy.mockResolvedValue(recruiters);
      applicationRepo.findBy.mockResolvedValue(interviewApps);
      assignmentRepo.create.mockImplementation((d) => d as Assignment);
      assignmentRepo.save.mockResolvedValue({} as Assignment);
      screeningReviewRepo.find.mockResolvedValue([]);

      // find returns a review so the delete branch is exercised
      interviewReviewRepo.find.mockResolvedValue([
        { id: 5 },
      ] as unknown as InterviewReview[]);

      const callOrder: string[] = [];
      interviewReviewRepo.delete.mockImplementation(() => {
        callOrder.push('interviewReview');
        return Promise.resolve({ affected: 1, raw: [] });
      });
      assignmentRepo.delete.mockImplementation(() => {
        callOrder.push('assignment');
        return Promise.resolve({ affected: 1, raw: [] });
      });

      await service.assignRecruiters([10], [1], 1, true);

      expect(callOrder).toEqual(['interviewReview', 'assignment']);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // Screening review preservation across reassignments
  // ──────────────────────────────────────────────────────────────────────
  describe('screening review preservation', () => {
    it('restores the screening review for a recruiter who stays in the new assignment set', async () => {
      const recruiters = [{ id: 1 }] as Recruiter[];
      const applications = [
        { id: 10, round: ApplicationRound.TECHNICAL_INTERVIEW },
      ] as Application[];

      recruiterRepo.findBy.mockResolvedValue(recruiters);
      applicationRepo.findBy.mockResolvedValue(applications);

      // No blocking reviews; no draft to delete
      interviewReviewRepo.find.mockResolvedValue([]);

      // collectScreeningReviews finds one screening review for recruiter 1 on app 10
      screeningReviewRepo.find.mockResolvedValue([
        {
          assignment: {
            recruiter: { id: 1 },
            application: { id: 10 },
          },
          scores: [],
        } as unknown as ScreeningReview,
      ]);

      const savedAssignment = {
        id: 99,
        recruiter: { id: 1 },
        application: { id: 10 },
      } as unknown as Assignment;
      assignmentRepo.create.mockImplementation((d) => d as Assignment);
      assignmentRepo.save.mockResolvedValue(savedAssignment);

      await service.assignRecruiters([10], [1], 1);

      expect(screeningReviewRepo.create).toHaveBeenCalledWith({
        assignment: savedAssignment,
      });
      expect(screeningReviewRepo.save).toHaveBeenCalled();
    });

    it('does not call screeningReviewRepo.create when a recruiter is removed from the assignment set', async () => {
      const recruiters = [{ id: 2 }] as Recruiter[]; // recruiter 2 is the NEW set; recruiter 1 is removed
      const applications = [
        { id: 10, round: ApplicationRound.TECHNICAL_INTERVIEW },
      ] as Application[];

      recruiterRepo.findBy.mockResolvedValue(recruiters);
      applicationRepo.findBy.mockResolvedValue(applications);

      interviewReviewRepo.find.mockResolvedValue([]);

      // Saved screening review for recruiter 1 (who is NOT in the new set)
      screeningReviewRepo.find.mockResolvedValue([
        {
          assignment: {
            recruiter: { id: 1 },
            application: { id: 10 },
          },
          scores: [],
        } as unknown as ScreeningReview,
      ]);

      assignmentRepo.create.mockImplementation((d) => d as Assignment);
      assignmentRepo.save.mockResolvedValue({
        id: 88,
        recruiter: { id: 2 },
        application: { id: 10 },
      } as unknown as Assignment);

      await service.assignRecruiters([10], [2], 1);

      // recruiter 1's review cannot be restored — create should NOT be called
      expect(screeningReviewRepo.create).not.toHaveBeenCalled();
    });

    it('restores screening review scores when they exist', async () => {
      const recruiters = [{ id: 1 }] as Recruiter[];
      const applications = [
        { id: 10, round: ApplicationRound.TECHNICAL_INTERVIEW },
      ] as Application[];

      recruiterRepo.findBy.mockResolvedValue(recruiters);
      applicationRepo.findBy.mockResolvedValue(applications);

      interviewReviewRepo.find.mockResolvedValue([]);

      const mockCriteria = { id: 3 };
      screeningReviewRepo.find.mockResolvedValue([
        {
          assignment: {
            recruiter: { id: 1 },
            application: { id: 10 },
          },
          scores: [{ criteria: mockCriteria, score: 4 }],
        } as unknown as ScreeningReview,
      ]);

      const savedAssignment = { id: 99 } as unknown as Assignment;
      const savedReview = { id: 50 } as unknown as ScreeningReview;
      assignmentRepo.create.mockImplementation((d) => d as Assignment);
      assignmentRepo.save.mockResolvedValue(savedAssignment);
      screeningReviewRepo.create.mockImplementation(
        (d) => d as ScreeningReview,
      );
      screeningReviewRepo.save.mockResolvedValue(savedReview);

      await service.assignRecruiters([10], [1], 1);

      expect(screeningReviewScoreRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          review: savedReview,
          criteria: mockCriteria,
          score: 4,
        }),
      );
      expect(screeningReviewScoreRepo.save).toHaveBeenCalled();
    });
  });
});
