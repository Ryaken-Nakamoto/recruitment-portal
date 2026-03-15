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
import { ApplicationRound } from '../../applications/enums/application-round.enum';
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

  beforeEach(async () => {
    const mockApplicationRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      findBy: jest.fn(),
      save: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    };
    const mockAssignmentRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
      find: jest.fn().mockResolvedValue([]),
    };
    const mockRecruiterRepo = {
      findBy: jest.fn(),
      findOne: jest.fn(),
    };
    const mockScreeningReviewRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockResolvedValue({}),
    };
    const mockScreeningReviewScoreRepo = {
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockResolvedValue([]),
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
        applicant: { name: 'Alice Smith' },
      },
      {
        id: 2,
        round: ApplicationRound.SCREENING,
        roundStatus: RoundStatus.IN_PROGRESS,
        applicant: { name: 'Bob Jones' },
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
        applicant: { name: 'Alice Smith' },
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
      recruiterRepo.findBy.mockResolvedValue([{ id: 1 }] as Recruiter[]);
      applicationRepo.findBy.mockResolvedValue([]);

      await expect(service.assignRecruiters([99], [1], 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when a recruiter ID is invalid', async () => {
      recruiterRepo.findBy.mockResolvedValue([]);

      await expect(service.assignRecruiters([1], [99], 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when any selected app has roundStatus PENDING_EMAIL', async () => {
      recruiterRepo.findBy.mockResolvedValue([{ id: 1 }] as Recruiter[]);
      applicationRepo.findBy.mockResolvedValue([
        {
          id: 10,
          round: ApplicationRound.SCREENING,
          roundStatus: RoundStatus.PENDING_EMAIL,
        },
      ] as Application[]);

      const err = await service.assignRecruiters([10], [1], 1).catch((e) => e);
      expect(err).toBeInstanceOf(BadRequestException);
      expect((err as BadRequestException).getResponse()).toMatchObject({
        blockedAppIds: [10],
      });
    });

    it('throws BadRequestException when any selected app has roundStatus EMAIL_SENT', async () => {
      recruiterRepo.findBy.mockResolvedValue([{ id: 1 }] as Recruiter[]);
      applicationRepo.findBy.mockResolvedValue([
        {
          id: 10,
          round: ApplicationRound.SCREENING,
          roundStatus: RoundStatus.EMAIL_SENT,
        },
      ] as Application[]);

      const err = await service.assignRecruiters([10], [1], 1).catch((e) => e);
      expect(err).toBeInstanceOf(BadRequestException);
      expect((err as BadRequestException).getResponse()).toMatchObject({
        blockedAppIds: [10],
      });
    });

    it('creates new assignments with round-robin distribution', async () => {
      const recruiters = [{ id: 1 }, { id: 2 }, { id: 3 }] as Recruiter[];
      const applications = [
        {
          id: 10,
          round: ApplicationRound.SCREENING,
          roundStatus: RoundStatus.PENDING,
        },
        {
          id: 11,
          round: ApplicationRound.SCREENING,
          roundStatus: RoundStatus.PENDING,
        },
      ] as Application[];

      recruiterRepo.findBy.mockResolvedValue(recruiters);
      applicationRepo.findBy.mockResolvedValue(applications);
      assignmentRepo.find.mockResolvedValue([]); // no existing assignments
      assignmentRepo.create.mockImplementation((data) => data as Assignment);
      assignmentRepo.save.mockResolvedValue({} as Assignment);

      const result = await service.assignRecruiters([10, 11], [1, 2, 3], 2);

      expect(assignmentRepo.create).toHaveBeenCalledTimes(4);
      expect(assignmentRepo.save).toHaveBeenCalledTimes(4);
      expect(result).toEqual({ assigned: 4, skippedAppIds: [] });
    });

    it('skips duplicate (app, recruiter) pairs that already exist', async () => {
      const recruiters = [{ id: 1 }, { id: 2 }] as Recruiter[];
      const applications = [
        {
          id: 10,
          round: ApplicationRound.SCREENING,
          roundStatus: RoundStatus.IN_PROGRESS,
        },
      ] as Application[];

      recruiterRepo.findBy.mockResolvedValue(recruiters);
      applicationRepo.findBy.mockResolvedValue(applications);
      // recruiter 1 already assigned to app 10
      assignmentRepo.find.mockResolvedValue([
        {
          application: { id: 10 },
          recruiter: { id: 1 },
        } as unknown as Assignment,
      ]);
      assignmentRepo.create.mockImplementation((data) => data as Assignment);
      assignmentRepo.save.mockResolvedValue({} as Assignment);

      const result = await service.assignRecruiters([10], [1, 2], 2);

      // Only recruiter 2 is new — recruiter 1 is skipped
      expect(assignmentRepo.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ assigned: 1, skippedAppIds: [10] });
    });

    it('returns 0 assigned and reports skipped app when all pairs already exist', async () => {
      const recruiters = [{ id: 1 }] as Recruiter[];
      const applications = [
        {
          id: 10,
          round: ApplicationRound.SCREENING,
          roundStatus: RoundStatus.IN_PROGRESS,
        },
      ] as Application[];

      recruiterRepo.findBy.mockResolvedValue(recruiters);
      applicationRepo.findBy.mockResolvedValue(applications);
      assignmentRepo.find.mockResolvedValue([
        {
          application: { id: 10 },
          recruiter: { id: 1 },
        } as unknown as Assignment,
      ]);

      const result = await service.assignRecruiters([10], [1], 1);

      expect(assignmentRepo.create).not.toHaveBeenCalled();
      expect(result).toEqual({ assigned: 0, skippedAppIds: [10] });
    });

    it('never deletes existing assignments', async () => {
      const recruiters = [{ id: 1 }] as Recruiter[];
      const applications = [
        {
          id: 10,
          round: ApplicationRound.SCREENING,
          roundStatus: RoundStatus.PENDING,
        },
      ] as Application[];

      recruiterRepo.findBy.mockResolvedValue(recruiters);
      applicationRepo.findBy.mockResolvedValue(applications);
      assignmentRepo.find.mockResolvedValue([]);
      assignmentRepo.create.mockImplementation((d) => d as Assignment);
      assignmentRepo.save.mockResolvedValue({} as Assignment);

      await service.assignRecruiters([10], [1], 1);

      expect(assignmentRepo.delete).not.toHaveBeenCalled();
    });

    it('sets roundStatus to IN_PROGRESS for PENDING apps that receive new assignments', async () => {
      const recruiters = [{ id: 1 }] as Recruiter[];
      const applications = [
        {
          id: 10,
          round: ApplicationRound.SCREENING,
          roundStatus: RoundStatus.PENDING,
        },
      ] as Application[];

      recruiterRepo.findBy.mockResolvedValue(recruiters);
      applicationRepo.findBy.mockResolvedValue(applications);
      assignmentRepo.find.mockResolvedValue([]);
      assignmentRepo.create.mockImplementation((d) => d as Assignment);
      assignmentRepo.save.mockResolvedValue({} as Assignment);

      await service.assignRecruiters([10], [1], 1);

      expect(applicationRepo.update).toHaveBeenCalledWith(
        { id: expect.anything() },
        { roundStatus: RoundStatus.IN_PROGRESS },
      );
    });

    it('resets AWAITING_ADMIN to IN_PROGRESS when a new assignment is added', async () => {
      const recruiters = [{ id: 2 }] as Recruiter[];
      const applications = [
        {
          id: 10,
          round: ApplicationRound.SCREENING,
          roundStatus: RoundStatus.AWAITING_ADMIN,
        },
      ] as Application[];

      recruiterRepo.findBy.mockResolvedValue(recruiters);
      applicationRepo.findBy.mockResolvedValue(applications);
      assignmentRepo.find.mockResolvedValue([]);
      assignmentRepo.create.mockImplementation((d) => d as Assignment);
      assignmentRepo.save.mockResolvedValue({} as Assignment);

      await service.assignRecruiters([10], [2], 1);

      expect(applicationRepo.update).toHaveBeenCalledWith(
        { id: expect.anything() },
        { roundStatus: RoundStatus.IN_PROGRESS },
      );
    });

    it('does not update roundStatus when all pairs are duplicates (no new assignments)', async () => {
      const recruiters = [{ id: 1 }] as Recruiter[];
      const applications = [
        {
          id: 10,
          round: ApplicationRound.SCREENING,
          roundStatus: RoundStatus.AWAITING_ADMIN,
        },
      ] as Application[];

      recruiterRepo.findBy.mockResolvedValue(recruiters);
      applicationRepo.findBy.mockResolvedValue(applications);
      assignmentRepo.find.mockResolvedValue([
        {
          application: { id: 10 },
          recruiter: { id: 1 },
        } as unknown as Assignment,
      ]);

      await service.assignRecruiters([10], [1], 1);

      expect(applicationRepo.update).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // getApplicationReviews
  // ──────────────────────────────────────────────────────────────────────
  describe('getApplicationReviews', () => {
    it('throws NotFoundException when application does not exist', async () => {
      applicationRepo.findOne.mockResolvedValue(null);
      await expect(service.getApplicationReviews(99)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns empty array when there are no assignments', async () => {
      applicationRepo.findOne.mockResolvedValue({ id: 1 } as Application);
      assignmentRepo.find.mockResolvedValue([]);

      const result = await service.getApplicationReviews(1);

      expect(result).toEqual([]);
    });

    it('returns not_started status when no screening review exists for assignment', async () => {
      applicationRepo.findOne.mockResolvedValue({ id: 1 } as Application);
      assignmentRepo.find.mockResolvedValue([
        {
          id: 10,
          notes: null,
          recruiter: { id: 5, firstName: 'Carol', lastName: 'White' },
          application: { id: 1 },
        } as unknown as Assignment,
      ]);
      screeningReviewRepo.find.mockResolvedValue([]);

      const result = await service.getApplicationReviews(1);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        assignmentId: 10,
        recruiterName: 'Carol White',
        reviewStatus: 'not_started',
        notes: null,
        rubricCriteria: [],
      });
    });

    it('returns submitted status with criteria and scores when review exists', async () => {
      applicationRepo.findOne.mockResolvedValue({ id: 1 } as Application);
      assignmentRepo.find.mockResolvedValue([
        {
          id: 10,
          notes: 'Great candidate',
          recruiter: { id: 5, firstName: 'Carol', lastName: 'White' },
          application: { id: 1 },
        } as unknown as Assignment,
      ]);
      screeningReviewRepo.find.mockResolvedValue([
        {
          assignment: { id: 10 },
          scores: [
            {
              criteria: {
                id: 3,
                name: 'Technical Skills',
                oneDescription: 'Basic',
                twoDescription: 'Intermediate',
                threeDescription: 'Advanced',
              },
              score: 2,
            },
          ],
        } as unknown as ScreeningReview,
      ]);

      const result = await service.getApplicationReviews(1);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        assignmentId: 10,
        recruiterName: 'Carol White',
        reviewStatus: 'submitted',
        notes: 'Great candidate',
        rubricCriteria: [
          {
            id: 3,
            name: 'Technical Skills',
            oneDescription: 'Basic',
            twoDescription: 'Intermediate',
            threeDescription: 'Advanced',
            score: 2,
          },
        ],
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // addReviewer
  // ──────────────────────────────────────────────────────────────────────
  describe('addReviewer', () => {
    const mockApp = {
      id: 10,
      round: ApplicationRound.SCREENING,
      roundStatus: RoundStatus.IN_PROGRESS,
      applicant: { name: 'Alice' },
    } as unknown as Application;

    const mockRecruiter = {
      id: 5,
      firstName: 'Carol',
      lastName: 'White',
    } as Recruiter;

    it('throws NotFoundException when application does not exist', async () => {
      applicationRepo.findOne.mockResolvedValue(null);
      await expect(service.addReviewer(99, 5)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when recruiter does not exist', async () => {
      applicationRepo.findOne.mockResolvedValue(mockApp);
      recruiterRepo.findOne.mockResolvedValue(null);
      await expect(service.addReviewer(10, 99)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when roundStatus is PENDING_EMAIL', async () => {
      const pendingEmailApp = {
        ...mockApp,
        roundStatus: RoundStatus.PENDING_EMAIL,
      } as unknown as Application;
      applicationRepo.findOne.mockResolvedValue(pendingEmailApp);
      await expect(service.addReviewer(10, 5)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when roundStatus is EMAIL_SENT', async () => {
      const emailSentApp = {
        ...mockApp,
        roundStatus: RoundStatus.EMAIL_SENT,
      } as unknown as Application;
      applicationRepo.findOne.mockResolvedValue(emailSentApp);
      await expect(service.addReviewer(10, 5)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws ConflictException when recruiter is already assigned', async () => {
      applicationRepo.findOne.mockResolvedValue(mockApp);
      recruiterRepo.findOne.mockResolvedValue(mockRecruiter);
      assignmentRepo.findOne.mockResolvedValue({ id: 1 } as Assignment);
      await expect(service.addReviewer(10, 5)).rejects.toThrow(
        ConflictException,
      );
    });

    it('creates a new assignment and returns info', async () => {
      applicationRepo.findOne.mockResolvedValue(mockApp);
      recruiterRepo.findOne.mockResolvedValue(mockRecruiter);
      assignmentRepo.findOne.mockResolvedValue(null);
      assignmentRepo.create.mockImplementation((d) => d as Assignment);
      assignmentRepo.save.mockResolvedValue({ id: 20 } as Assignment);

      const result = await service.addReviewer(10, 5);

      expect(assignmentRepo.create).toHaveBeenCalledWith({
        recruiter: mockRecruiter,
        application: mockApp,
      });
      expect(result.assignmentId).toBe(20);
      expect(result.recruiterName).toBe('Carol White');
    });

    it('resets roundStatus to IN_PROGRESS when app is AWAITING_ADMIN', async () => {
      const awaitingApp = {
        ...mockApp,
        roundStatus: RoundStatus.AWAITING_ADMIN,
      } as unknown as Application;

      applicationRepo.findOne.mockResolvedValue(awaitingApp);
      recruiterRepo.findOne.mockResolvedValue(mockRecruiter);
      assignmentRepo.findOne.mockResolvedValue(null);
      assignmentRepo.create.mockImplementation((d) => d as Assignment);
      assignmentRepo.save.mockResolvedValue({ id: 21 } as Assignment);

      await service.addReviewer(10, 5);

      expect(applicationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ roundStatus: RoundStatus.IN_PROGRESS }),
      );
    });

    it('does NOT save application when roundStatus is already IN_PROGRESS', async () => {
      applicationRepo.findOne.mockResolvedValue(mockApp);
      recruiterRepo.findOne.mockResolvedValue(mockRecruiter);
      assignmentRepo.findOne.mockResolvedValue(null);
      assignmentRepo.create.mockImplementation((d) => d as Assignment);
      assignmentRepo.save.mockResolvedValue({ id: 22 } as Assignment);

      await service.addReviewer(10, 5);

      expect(applicationRepo.save).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // removeReviewer
  // ──────────────────────────────────────────────────────────────────────
  describe('removeReviewer', () => {
    const mockRecruiter = {
      id: 5,
      firstName: 'Carol',
      lastName: 'White',
    } as Recruiter;

    const mockAssignment = {
      id: 3,
      recruiter: mockRecruiter,
      application: {
        id: 10,
        roundStatus: RoundStatus.IN_PROGRESS,
      } as Application,
    } as unknown as Assignment;

    it('throws NotFoundException when assignment does not exist', async () => {
      assignmentRepo.findOne.mockResolvedValue(null);
      await expect(service.removeReviewer(99)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when application is in PENDING_EMAIL', async () => {
      const appInPendingEmail = {
        id: 10,
        roundStatus: RoundStatus.PENDING_EMAIL,
      } as Application;
      assignmentRepo.findOne.mockResolvedValue({
        ...mockAssignment,
        application: appInPendingEmail,
      });

      await expect(service.removeReviewer(3)).rejects.toThrow(
        BadRequestException,
      );
      expect(assignmentRepo.delete).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when application is in EMAIL_SENT', async () => {
      const appInEmailSent = {
        id: 10,
        roundStatus: RoundStatus.EMAIL_SENT,
      } as Application;
      assignmentRepo.findOne.mockResolvedValue({
        ...mockAssignment,
        application: appInEmailSent,
      });

      await expect(service.removeReviewer(3)).rejects.toThrow(
        BadRequestException,
      );
      expect(assignmentRepo.delete).not.toHaveBeenCalled();
    });

    it('returns conflict info when review exists and force is false', async () => {
      assignmentRepo.findOne.mockResolvedValue(mockAssignment);
      screeningReviewRepo.findOne.mockResolvedValue({
        id: 7,
      } as unknown as ScreeningReview);

      const result = await service.removeReviewer(3, false);

      expect(result).toMatchObject({
        conflict: true,
        hasReview: true,
        recruiterName: 'Carol White',
      });
      expect(assignmentRepo.delete).not.toHaveBeenCalled();
    });

    it('deletes assignment when force is true even with a review', async () => {
      assignmentRepo.findOne.mockResolvedValue(mockAssignment);
      screeningReviewRepo.findOne.mockResolvedValue({
        id: 7,
      } as unknown as ScreeningReview);
      assignmentRepo.find.mockResolvedValue([]);
      screeningReviewRepo.count.mockResolvedValue(0);

      const result = await service.removeReviewer(3, true);

      expect(assignmentRepo.delete).toHaveBeenCalledWith({ id: 3 });
      expect(result).toMatchObject({ conflict: false });
    });

    it('deletes assignment when no review exists', async () => {
      assignmentRepo.findOne.mockResolvedValue(mockAssignment);
      screeningReviewRepo.findOne.mockResolvedValue(null);
      assignmentRepo.find.mockResolvedValue([]);
      screeningReviewRepo.count.mockResolvedValue(0);

      const result = await service.removeReviewer(3, false);

      expect(assignmentRepo.delete).toHaveBeenCalledWith({ id: 3 });
      expect(result).toMatchObject({
        conflict: false,
        roundStatus: RoundStatus.PENDING,
      });
    });

    it('sets roundStatus to AWAITING_ADMIN when all remaining reviewers have reviewed', async () => {
      const remainingAssignment = { id: 4 } as Assignment;
      assignmentRepo.findOne.mockResolvedValue(mockAssignment);
      screeningReviewRepo.findOne.mockResolvedValue(null);
      assignmentRepo.find.mockResolvedValue([remainingAssignment]);
      screeningReviewRepo.count.mockResolvedValue(1); // all reviewed

      const result = await service.removeReviewer(3, false);

      expect(applicationRepo.update).toHaveBeenCalledWith(
        { id: 10 },
        { roundStatus: RoundStatus.AWAITING_ADMIN },
      );
      expect(result).toMatchObject({
        conflict: false,
        roundStatus: RoundStatus.AWAITING_ADMIN,
      });
    });

    it('sets roundStatus to IN_PROGRESS when some remaining reviewers have not reviewed', async () => {
      const remaining = [{ id: 4 }, { id: 5 }] as Assignment[];
      assignmentRepo.findOne.mockResolvedValue(mockAssignment);
      screeningReviewRepo.findOne.mockResolvedValue(null);
      assignmentRepo.find.mockResolvedValue(remaining);
      screeningReviewRepo.count.mockResolvedValue(1); // not all reviewed

      const result = await service.removeReviewer(3, false);

      expect(applicationRepo.update).toHaveBeenCalledWith(
        { id: 10 },
        { roundStatus: RoundStatus.IN_PROGRESS },
      );
      expect(result).toMatchObject({
        conflict: false,
        roundStatus: RoundStatus.IN_PROGRESS,
      });
    });

    it('sets roundStatus to PENDING when no assignments remain', async () => {
      assignmentRepo.findOne.mockResolvedValue(mockAssignment);
      screeningReviewRepo.findOne.mockResolvedValue(null);
      assignmentRepo.find.mockResolvedValue([]);

      const result = await service.removeReviewer(3, false);

      expect(applicationRepo.update).toHaveBeenCalledWith(
        { id: 10 },
        { roundStatus: RoundStatus.PENDING },
      );
      expect(result).toMatchObject({
        conflict: false,
        roundStatus: RoundStatus.PENDING,
      });
    });
  });
});
