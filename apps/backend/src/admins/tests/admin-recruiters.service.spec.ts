import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';

import { AdminRecruitersService } from '../admin-recruiters.service';
import { Recruiter } from '../../recruiters/entities/recruiter.entity';
import { User } from '../../users/user.entity';
import { AccountStatus } from '../../users/status';
import { CognitoService } from '../../util/cognito/cognito.service';
import { Assignment } from '../../applications/entities/assignment.entity';
import { ScreeningReview } from '../../applications/entities/screening-review.entity';
import { InterviewReview } from '../../applications/entities/interview-review.entity';
import { ApplicationRound } from '../../applications/enums/application-round.enum';
import { RoundStatus } from '../../applications/enums/round-status.enum';
import { InterviewReviewStatus } from '../../applications/enums/interview-review-status.enum';

describe('AdminRecruitersService', () => {
  let service: AdminRecruitersService;
  let recruiterRepo: jest.Mocked<Repository<Recruiter>>;
  let userRepo: jest.Mocked<Repository<User>>;
  let assignmentRepo: jest.Mocked<Repository<Assignment>>;
  let screeningReviewRepo: jest.Mocked<Repository<ScreeningReview>>;
  let interviewReviewRepo: jest.Mocked<Repository<InterviewReview>>;
  let cognitoService: jest.Mocked<CognitoService>;

  beforeEach(async () => {
    const mockRecruiterRepo = {
      findAndCount: jest.fn(),
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const mockUserRepo = {
      findOneBy: jest.fn(),
    };

    const mockAssignmentRepo = {
      find: jest.fn(),
    };

    const mockScreeningReviewRepo = {
      find: jest.fn(),
    };

    const mockInterviewReviewRepo = {
      find: jest.fn(),
    };

    const mockCognitoService = {
      adminCreateUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminRecruitersService,
        { provide: getRepositoryToken(Recruiter), useValue: mockRecruiterRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        {
          provide: getRepositoryToken(Assignment),
          useValue: mockAssignmentRepo,
        },
        {
          provide: getRepositoryToken(ScreeningReview),
          useValue: mockScreeningReviewRepo,
        },
        {
          provide: getRepositoryToken(InterviewReview),
          useValue: mockInterviewReviewRepo,
        },
        { provide: CognitoService, useValue: mockCognitoService },
      ],
    }).compile();

    service = module.get<AdminRecruitersService>(AdminRecruitersService);
    recruiterRepo = module.get(getRepositoryToken(Recruiter));
    userRepo = module.get(getRepositoryToken(User));
    assignmentRepo = module.get(getRepositoryToken(Assignment));
    screeningReviewRepo = module.get(getRepositoryToken(ScreeningReview));
    interviewReviewRepo = module.get(getRepositoryToken(InterviewReview));
    cognitoService = module.get(CognitoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listRecruiters', () => {
    it('should return paginated recruiters', async () => {
      const recruiters = [{ id: 1 }, { id: 2 }] as Recruiter[];
      recruiterRepo.findAndCount.mockResolvedValue([recruiters, 2]);

      const result = await service.listRecruiters(1, 20);

      expect(recruiterRepo.findAndCount).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
        order: { createdDate: 'DESC' },
      });
      expect(result).toEqual({
        data: recruiters,
        total: 2,
        page: 1,
        totalPages: 1,
      });
    });
  });

  describe('inviteRecruiter', () => {
    it('rolls back recruiter row when non-UsernameExists Cognito error occurs', async () => {
      const recruiter = {
        firstName: null,
        lastName: null,
        email: 'jane@example.com',
        accountStatus: AccountStatus.INVITE_SENT,
      } as unknown as Recruiter;
      recruiterRepo.create.mockReturnValue(recruiter);
      recruiterRepo.save.mockResolvedValue(recruiter);
      recruiterRepo.remove.mockResolvedValue(recruiter);
      cognitoService.adminCreateUser.mockRejectedValue(
        new Error('Cognito unavailable'),
      );

      await expect(service.inviteRecruiter('jane@example.com')).rejects.toThrow(
        InternalServerErrorException,
      );

      expect(recruiterRepo.remove).toHaveBeenCalledWith(recruiter);
    });

    it('should create recruiter even when Cognito user already exists', async () => {
      const recruiter = {
        firstName: null,
        lastName: null,
        email: 'jane@example.com',
        accountStatus: AccountStatus.INVITE_SENT,
      } as unknown as Recruiter;
      recruiterRepo.create.mockReturnValue(recruiter);
      recruiterRepo.save.mockResolvedValue(recruiter);
      cognitoService.adminCreateUser.mockRejectedValue(
        new Error('UsernameExistsException: Username already exists'),
      );

      const result = await service.inviteRecruiter('jane@example.com');

      expect(recruiterRepo.create).toHaveBeenCalledWith({
        firstName: null,
        lastName: null,
        email: 'jane@example.com',
        accountStatus: AccountStatus.INVITE_SENT,
      });
      expect(recruiterRepo.save).toHaveBeenCalledWith(recruiter);
      expect(recruiterRepo.remove).not.toHaveBeenCalled();
      expect(result).toEqual(recruiter);
    });

    it('should create recruiter with null names and call cognito', async () => {
      const recruiter = {
        firstName: null,
        lastName: null,
        email: 'jane@example.com',
        accountStatus: AccountStatus.INVITE_SENT,
      } as unknown as Recruiter;
      recruiterRepo.create.mockReturnValue(recruiter);
      recruiterRepo.save.mockResolvedValue(recruiter);
      cognitoService.adminCreateUser.mockResolvedValue(undefined);

      const result = await service.inviteRecruiter('jane@example.com');

      expect(recruiterRepo.create).toHaveBeenCalledWith({
        firstName: null,
        lastName: null,
        email: 'jane@example.com',
        accountStatus: AccountStatus.INVITE_SENT,
      });
      expect(recruiterRepo.save).toHaveBeenCalledWith(recruiter);
      expect(cognitoService.adminCreateUser).toHaveBeenCalledWith(
        'jane@example.com',
      );
      expect(result).toEqual(recruiter);
    });
  });

  describe('deactivateRecruiter', () => {
    it('should throw NotFoundException if recruiter does not exist', async () => {
      recruiterRepo.findOneBy.mockResolvedValue(null);

      await expect(service.deactivateRecruiter(99)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should set status to DEACTIVATED and save', async () => {
      const recruiter = {
        id: 1,
        accountStatus: AccountStatus.ACTIVATED,
      } as Recruiter;
      recruiterRepo.findOneBy.mockResolvedValue(recruiter);
      recruiterRepo.save.mockResolvedValue({
        ...recruiter,
        accountStatus: AccountStatus.DEACTIVATED,
      });

      const result = await service.deactivateRecruiter(1);

      expect(recruiter.accountStatus).toBe(AccountStatus.DEACTIVATED);
      expect(recruiterRepo.save).toHaveBeenCalledWith(recruiter);
      expect(result.accountStatus).toBe(AccountStatus.DEACTIVATED);
    });
  });

  describe('reactivateRecruiter', () => {
    it('should throw NotFoundException if recruiter does not exist', async () => {
      recruiterRepo.findOneBy.mockResolvedValue(null);

      await expect(service.reactivateRecruiter(99)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should set status to ACTIVATED and save', async () => {
      const recruiter = {
        id: 1,
        accountStatus: AccountStatus.DEACTIVATED,
      } as Recruiter;
      recruiterRepo.findOneBy.mockResolvedValue(recruiter);
      recruiterRepo.save.mockResolvedValue({
        ...recruiter,
        accountStatus: AccountStatus.ACTIVATED,
      });

      const result = await service.reactivateRecruiter(1);

      expect(recruiter.accountStatus).toBe(AccountStatus.ACTIVATED);
      expect(recruiterRepo.save).toHaveBeenCalledWith(recruiter);
      expect(result.accountStatus).toBe(AccountStatus.ACTIVATED);
    });
  });

  describe('getRecruiterDetail', () => {
    it('should throw NotFoundException if recruiter does not exist', async () => {
      recruiterRepo.findOneBy.mockResolvedValue(null);

      await expect(service.getRecruiterDetail(99)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return detail with empty assignments when recruiter has none', async () => {
      const recruiter = {
        id: 1,
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        accountStatus: AccountStatus.ACTIVATED,
        createdDate: new Date('2025-01-01'),
      } as Recruiter;
      recruiterRepo.findOneBy.mockResolvedValue(recruiter);
      assignmentRepo.find.mockResolvedValue([]);
      interviewReviewRepo.find.mockResolvedValue([]);

      const result = await service.getRecruiterDetail(1);

      expect(result.id).toBe(1);
      expect(result.firstName).toBe('Jane');
      expect(result.stats).toEqual({
        total: 0,
        submitted: 0,
        notStarted: 0,
        inProgress: 0,
      });
      expect(result.assignments).toEqual([]);
    });

    it('should compute correct reviewStatus for screening assignments', async () => {
      const recruiter = {
        id: 1,
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        accountStatus: AccountStatus.ACTIVATED,
        createdDate: new Date('2025-01-01'),
      } as Recruiter;
      recruiterRepo.findOneBy.mockResolvedValue(recruiter);

      const assignedAt = new Date('2025-02-01');
      const assignments = [
        {
          id: 10,
          assignedAt,
          application: {
            id: 100,
            round: ApplicationRound.SCREENING,
            roundStatus: RoundStatus.PENDING,
            applicant: { name: 'Alice Smith' },
          },
        },
        {
          id: 11,
          assignedAt,
          application: {
            id: 101,
            round: ApplicationRound.SCREENING,
            roundStatus: RoundStatus.PENDING,
            applicant: { name: 'Bob Jones' },
          },
        },
      ] as unknown as Assignment[];

      assignmentRepo.find.mockResolvedValue(assignments);
      screeningReviewRepo.find.mockResolvedValue([
        { assignment: { id: 10 } } as unknown as ScreeningReview,
      ]);
      interviewReviewRepo.find.mockResolvedValue([]);

      const result = await service.getRecruiterDetail(1);

      expect(result.assignments[0].reviewStatus).toBe('submitted');
      expect(result.assignments[1].reviewStatus).toBe('not_started');
      expect(result.stats.submitted).toBe(1);
      expect(result.stats.notStarted).toBe(1);
      expect(result.stats.inProgress).toBe(0);
      expect(result.stats.total).toBe(2);
    });

    it('should compute correct reviewStatus for interview assignments', async () => {
      const recruiter = {
        id: 1,
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        accountStatus: AccountStatus.ACTIVATED,
        createdDate: new Date('2025-01-01'),
      } as Recruiter;
      recruiterRepo.findOneBy.mockResolvedValue(recruiter);

      const assignedAt = new Date('2025-02-01');
      const assignments = [
        {
          id: 20,
          assignedAt,
          application: {
            id: 200,
            round: ApplicationRound.TECHNICAL_INTERVIEW,
            roundStatus: RoundStatus.IN_PROGRESS,
            applicant: { name: 'Carol White' },
          },
        },
        {
          id: 21,
          assignedAt,
          application: {
            id: 201,
            round: ApplicationRound.TECHNICAL_INTERVIEW,
            roundStatus: RoundStatus.IN_PROGRESS,
            applicant: { name: 'Dave Brown' },
          },
        },
      ] as unknown as Assignment[];

      assignmentRepo.find.mockResolvedValue(assignments);
      screeningReviewRepo.find.mockResolvedValue([]);
      interviewReviewRepo.find.mockResolvedValue([
        {
          application: { id: 200 },
          round: ApplicationRound.TECHNICAL_INTERVIEW,
          status: InterviewReviewStatus.PENDING_APPROVAL,
        } as unknown as InterviewReview,
      ]);

      const result = await service.getRecruiterDetail(1);

      expect(result.assignments[0].reviewStatus).toBe(
        InterviewReviewStatus.PENDING_APPROVAL,
      );
      expect(result.assignments[1].reviewStatus).toBe('not_started');
      expect(result.stats.inProgress).toBe(1);
      expect(result.stats.notStarted).toBe(1);
      expect(result.stats.submitted).toBe(0);
    });

    it('should count approved interview reviews as submitted', async () => {
      const recruiter = {
        id: 1,
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        accountStatus: AccountStatus.ACTIVATED,
        createdDate: new Date('2025-01-01'),
      } as Recruiter;
      recruiterRepo.findOneBy.mockResolvedValue(recruiter);

      const assignedAt = new Date('2025-02-01');
      const assignments = [
        {
          id: 30,
          assignedAt,
          application: {
            id: 300,
            round: ApplicationRound.BEHAVIORAL_INTERVIEW,
            roundStatus: RoundStatus.IN_PROGRESS,
            applicant: { name: 'Eve Green' },
          },
        },
      ] as unknown as Assignment[];

      assignmentRepo.find.mockResolvedValue(assignments);
      screeningReviewRepo.find.mockResolvedValue([]);
      interviewReviewRepo.find.mockResolvedValue([
        {
          application: { id: 300 },
          round: ApplicationRound.BEHAVIORAL_INTERVIEW,
          status: InterviewReviewStatus.APPROVED,
        } as unknown as InterviewReview,
      ]);

      const result = await service.getRecruiterDetail(1);

      expect(result.assignments[0].reviewStatus).toBe(
        InterviewReviewStatus.APPROVED,
      );
      expect(result.stats.submitted).toBe(1);
    });
  });
});
