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

  // Shared query builder mock for createQueryBuilder tests
  let mockQb: {
    leftJoinAndSelect: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    getManyAndCount: jest.Mock;
  };

  beforeEach(async () => {
    mockQb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

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
      createQueryBuilder: jest.fn().mockReturnValue(mockQb),
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
      ],
    }).compile();

    service = module.get<AdminAssignmentsService>(AdminAssignmentsService);
    applicationRepo = module.get(getRepositoryToken(Application));
    assignmentRepo = module.get(getRepositoryToken(Assignment));
    recruiterRepo = module.get(getRepositoryToken(Recruiter));
    screeningReviewRepo = module.get(getRepositoryToken(ScreeningReview));
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

    it('creates new assignments with round-robin distribution and sets round field', async () => {
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
      // Verify round is set on each created assignment
      expect(assignmentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ round: ApplicationRound.SCREENING }),
      );
      expect(assignmentRepo.save).toHaveBeenCalledTimes(4);
      expect(result).toEqual({ assigned: 4, skippedApps: [] });
    });

    it('skips duplicate (app, recruiter, round) pairs that already exist', async () => {
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
      // recruiter 1 already assigned to app 10 in SCREENING
      assignmentRepo.find.mockResolvedValue([
        {
          application: { id: 10 },
          recruiter: { id: 1, firstName: 'Alice', lastName: 'Chen' },
          round: ApplicationRound.SCREENING,
        } as unknown as Assignment,
      ]);
      assignmentRepo.create.mockImplementation((data) => data as Assignment);
      assignmentRepo.save.mockResolvedValue({} as Assignment);

      const result = await service.assignRecruiters([10], [1, 2], 2);

      // Only recruiter 2 is new — recruiter 1 is skipped (same round)
      expect(assignmentRepo.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        assigned: 1,
        skippedApps: [{ appId: 10, existingRecruiters: ['Alice Chen'] }],
      });
    });

    it('allows same recruiter to be assigned to same app in a different round', async () => {
      const recruiters = [{ id: 1 }] as Recruiter[];
      const applications = [
        {
          id: 10,
          round: ApplicationRound.TECHNICAL_INTERVIEW,
          roundStatus: RoundStatus.PENDING,
        },
      ] as Application[];

      recruiterRepo.findBy.mockResolvedValue(recruiters);
      applicationRepo.findBy.mockResolvedValue(applications);
      // recruiter 1 already assigned in SCREENING (retired), not in TECHNICAL_INTERVIEW
      assignmentRepo.find.mockResolvedValue([
        {
          application: { id: 10 },
          recruiter: { id: 1 },
          round: ApplicationRound.SCREENING, // different round
        } as unknown as Assignment,
      ]);
      assignmentRepo.create.mockImplementation((data) => data as Assignment);
      assignmentRepo.save.mockResolvedValue({} as Assignment);

      const result = await service.assignRecruiters([10], [1], 1);

      // Should create a new assignment for TECHNICAL_INTERVIEW (not skipped)
      expect(assignmentRepo.create).toHaveBeenCalledTimes(1);
      expect(assignmentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          round: ApplicationRound.TECHNICAL_INTERVIEW,
        }),
      );
      expect(result).toEqual({ assigned: 1, skippedApps: [] });
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
          recruiter: { id: 1, firstName: 'Alice', lastName: 'Chen' },
          round: ApplicationRound.SCREENING,
        } as unknown as Assignment,
      ]);

      const result = await service.assignRecruiters([10], [1], 1);

      expect(assignmentRepo.create).not.toHaveBeenCalled();
      expect(result).toEqual({
        assigned: 0,
        skippedApps: [{ appId: 10, existingRecruiters: ['Alice Chen'] }],
      });
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
          round: ApplicationRound.SCREENING,
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
      applicationRepo.findOne.mockResolvedValue({
        id: 1,
        round: ApplicationRound.SCREENING,
      } as Application);
      assignmentRepo.find.mockResolvedValue([]);

      const result = await service.getApplicationReviews(1);

      expect(result).toEqual([]);
    });

    it('returns not_started status when no screening review exists for assignment', async () => {
      applicationRepo.findOne.mockResolvedValue({
        id: 1,
        round: ApplicationRound.SCREENING,
      } as Application);
      assignmentRepo.find.mockResolvedValue([
        {
          id: 10,
          round: ApplicationRound.SCREENING,
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
      applicationRepo.findOne.mockResolvedValue({
        id: 1,
        round: ApplicationRound.SCREENING,
      } as Application);
      assignmentRepo.find.mockResolvedValue([
        {
          id: 10,
          round: ApplicationRound.SCREENING,
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

    it('excludes retired assignments (from previous rounds) from results', async () => {
      // Application is now in TECHNICAL_INTERVIEW
      applicationRepo.findOne.mockResolvedValue({
        id: 1,
        round: ApplicationRound.TECHNICAL_INTERVIEW,
      } as Application);
      // Only current-round assignments returned (mock repo respects where clause by returning empty)
      assignmentRepo.find.mockResolvedValue([]);

      const result = await service.getApplicationReviews(1);

      // Verify the find was called with the current round filter
      expect(assignmentRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            round: ApplicationRound.TECHNICAL_INTERVIEW,
          }),
        }),
      );
      expect(result).toEqual([]);
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

    it('throws ConflictException when recruiter is already assigned in the same round', async () => {
      applicationRepo.findOne.mockResolvedValue(mockApp);
      recruiterRepo.findOne.mockResolvedValue(mockRecruiter);
      assignmentRepo.findOne.mockResolvedValue({ id: 1 } as Assignment);
      await expect(service.addReviewer(10, 5)).rejects.toThrow(
        ConflictException,
      );
    });

    it('creates a new assignment with the current round and returns info', async () => {
      applicationRepo.findOne.mockResolvedValue(mockApp);
      recruiterRepo.findOne.mockResolvedValue(mockRecruiter);
      assignmentRepo.findOne.mockResolvedValue(null);
      assignmentRepo.create.mockImplementation((d) => d as Assignment);
      assignmentRepo.save.mockResolvedValue({ id: 20 } as Assignment);

      const result = await service.addReviewer(10, 5);

      expect(assignmentRepo.create).toHaveBeenCalledWith({
        recruiter: mockRecruiter,
        application: mockApp,
        round: ApplicationRound.SCREENING,
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
      round: ApplicationRound.SCREENING,
      recruiter: mockRecruiter,
      application: {
        id: 10,
        round: ApplicationRound.SCREENING,
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
        round: ApplicationRound.SCREENING,
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
        round: ApplicationRound.SCREENING,
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

    it('throws BadRequestException when trying to remove a retired assignment (assignment.round !== app.round)', async () => {
      const retiredAssignment = {
        id: 3,
        round: ApplicationRound.SCREENING, // old round
        recruiter: mockRecruiter,
        application: {
          id: 10,
          round: ApplicationRound.TECHNICAL_INTERVIEW, // app has advanced
          roundStatus: RoundStatus.PENDING,
        } as Application,
      } as unknown as Assignment;
      assignmentRepo.findOne.mockResolvedValue(retiredAssignment);

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

  // ──────────────────────────────────────────────────────────────────────
  // getAssignmentHistory
  // ──────────────────────────────────────────────────────────────────────
  describe('getAssignmentHistory', () => {
    it('returns paginated list of retired assignments', async () => {
      const retiredAssignment = {
        id: 5,
        round: ApplicationRound.SCREENING,
        assignedAt: new Date('2026-01-01'),
        application: {
          id: 10,
          round: ApplicationRound.TECHNICAL_INTERVIEW,
          applicant: { name: 'Alice Smith' },
        },
        recruiter: { id: 1, firstName: 'Carol', lastName: 'White' },
      } as unknown as Assignment;

      mockQb.getManyAndCount.mockResolvedValue([[retiredAssignment], 1]);
      screeningReviewRepo.find.mockResolvedValue([]);

      const result = await service.getAssignmentHistory(1, 20);

      expect(assignmentRepo.createQueryBuilder).toHaveBeenCalledWith('a');
      expect(mockQb.where).toHaveBeenCalledWith('a.round != app.round');
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        id: 5,
        applicantName: 'Alice Smith',
        applicationId: 10,
        round: ApplicationRound.SCREENING,
        recruiterName: 'Carol White',
        reviewStatus: 'not_started',
      });
    });

    it('marks retired assignment as submitted when review exists', async () => {
      const retiredAssignment = {
        id: 5,
        round: ApplicationRound.SCREENING,
        assignedAt: new Date('2026-01-01'),
        application: {
          id: 10,
          round: ApplicationRound.TECHNICAL_INTERVIEW,
          applicant: { name: 'Bob Jones' },
        },
        recruiter: { id: 2, firstName: 'Dave', lastName: 'Brown' },
      } as unknown as Assignment;

      mockQb.getManyAndCount.mockResolvedValue([[retiredAssignment], 1]);
      screeningReviewRepo.find.mockResolvedValue([
        { assignment: { id: 5 } } as unknown as ScreeningReview,
      ]);

      const result = await service.getAssignmentHistory(1, 20);

      expect(result.data[0].reviewStatus).toBe('submitted');
    });

    it('returns empty list when no retired assignments exist', async () => {
      mockQb.getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.getAssignmentHistory(1, 20);

      expect(result).toEqual({ data: [], total: 0, page: 1, totalPages: 0 });
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // getAssignmentHistoryDetail
  // ──────────────────────────────────────────────────────────────────────
  describe('getAssignmentHistoryDetail', () => {
    it('throws NotFoundException when assignment does not exist', async () => {
      assignmentRepo.findOne.mockResolvedValue(null);
      await expect(service.getAssignmentHistoryDetail(99)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns full detail with not_started reviewStatus when no review exists', async () => {
      const mockAssignment = {
        id: 5,
        round: ApplicationRound.SCREENING,
        assignedAt: new Date('2026-01-01'),
        notes: null,
        recruiter: { id: 1, firstName: 'Carol', lastName: 'White' },
        application: {
          id: 10,
          round: ApplicationRound.TECHNICAL_INTERVIEW,
          roundStatus: RoundStatus.PENDING,
          applicant: {
            id: 100,
            name: 'Alice Smith',
            email: 'alice@example.com',
            major: 'CS',
            academicYear: 'Junior',
          },
          rawGoogleForm: { fullName: 'Alice Smith', year: 'Junior' },
        },
      } as unknown as Assignment;

      assignmentRepo.findOne.mockResolvedValue(mockAssignment);
      screeningReviewRepo.findOne.mockResolvedValue(null);

      const result = await service.getAssignmentHistoryDetail(5);

      expect(result).toMatchObject({
        assignmentId: 5,
        recruiterName: 'Carol White',
        recruiterId: 1,
        round: ApplicationRound.SCREENING,
        reviewStatus: 'not_started',
        rubricCriteria: [],
        notes: null,
      });
      expect(result.application.id).toBe(10);
      expect(result.application.applicant.name).toBe('Alice Smith');
    });

    it('returns rubricCriteria with scores when review exists', async () => {
      const mockAssignment = {
        id: 5,
        round: ApplicationRound.SCREENING,
        assignedAt: new Date('2026-01-01'),
        notes: 'Strong candidate',
        recruiter: { id: 1, firstName: 'Carol', lastName: 'White' },
        application: {
          id: 10,
          round: ApplicationRound.TECHNICAL_INTERVIEW,
          roundStatus: RoundStatus.PENDING,
          applicant: {
            id: 100,
            name: 'Alice Smith',
            email: 'alice@example.com',
            major: 'CS',
            academicYear: 'Junior',
          },
          rawGoogleForm: {},
        },
      } as unknown as Assignment;

      assignmentRepo.findOne.mockResolvedValue(mockAssignment);
      screeningReviewRepo.findOne.mockResolvedValue({
        scores: [
          {
            criteria: {
              id: 3,
              name: 'Technical',
              oneDescription: '1',
              twoDescription: '2',
              threeDescription: '3',
            },
            score: 2,
          },
        ],
      } as unknown as ScreeningReview);

      const result = await service.getAssignmentHistoryDetail(5);

      expect(result.reviewStatus).toBe('submitted');
      expect(result.rubricCriteria).toHaveLength(1);
      expect(result.rubricCriteria[0]).toMatchObject({ id: 3, score: 2 });
      expect(result.notes).toBe('Strong candidate');
    });
  });
});
