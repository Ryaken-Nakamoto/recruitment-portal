import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';

import { AdminRecruitersService } from '../admin-recruiters.service';
import { Recruiter } from '../../recruiters/entities/recruiter.entity';
import { User } from '../../users/user.entity';
import { AccountStatus } from '../../users/status';
import { CognitoService } from '../../util/cognito/cognito.service';

describe('AdminRecruitersService', () => {
  let service: AdminRecruitersService;
  let recruiterRepo: jest.Mocked<Repository<Recruiter>>;
  let userRepo: jest.Mocked<Repository<User>>;
  let cognitoService: jest.Mocked<CognitoService>;

  beforeEach(async () => {
    const mockRecruiterRepo = {
      findAndCount: jest.fn(),
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockUserRepo = {
      findOneBy: jest.fn(),
    };

    const mockCognitoService = {
      adminCreateUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminRecruitersService,
        { provide: getRepositoryToken(Recruiter), useValue: mockRecruiterRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: CognitoService, useValue: mockCognitoService },
      ],
    }).compile();

    service = module.get<AdminRecruitersService>(AdminRecruitersService);
    recruiterRepo = module.get(getRepositoryToken(Recruiter));
    userRepo = module.get(getRepositoryToken(User));
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
    it('should throw ConflictException if email already exists', async () => {
      userRepo.findOneBy.mockResolvedValue({
        id: 1,
        email: 'jane@example.com',
      } as User);

      await expect(
        service.inviteRecruiter('Jane', 'Doe', 'jane@example.com'),
      ).rejects.toThrow(ConflictException);
    });

    it('should create recruiter and call cognito when email is new', async () => {
      userRepo.findOneBy.mockResolvedValue(null);
      const recruiter = {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        accountStatus: AccountStatus.INVITE_SENT,
      } as Recruiter;
      recruiterRepo.create.mockReturnValue(recruiter);
      recruiterRepo.save.mockResolvedValue(recruiter);
      cognitoService.adminCreateUser.mockResolvedValue(undefined);

      const result = await service.inviteRecruiter(
        'Jane',
        'Doe',
        'jane@example.com',
      );

      expect(recruiterRepo.create).toHaveBeenCalledWith({
        firstName: 'Jane',
        lastName: 'Doe',
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
});
