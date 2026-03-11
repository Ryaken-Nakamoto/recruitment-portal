import { Test, TestingModule } from '@nestjs/testing';
import { AdminRecruitersController } from '../admin-recruiters.controller';
import { AdminRecruitersService } from '../admin-recruiters.service';
import { InviteRecruiterDto } from '../dto/invite-recruiter.dto';

describe('AdminRecruitersController', () => {
  let controller: AdminRecruitersController;
  let service: jest.Mocked<AdminRecruitersService>;

  beforeEach(async () => {
    const mockService = {
      listRecruiters: jest.fn(),
      inviteRecruiter: jest.fn(),
      deactivateRecruiter: jest.fn(),
      reactivateRecruiter: jest.fn(),
    } as unknown as jest.Mocked<AdminRecruitersService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminRecruitersController],
      providers: [{ provide: AdminRecruitersService, useValue: mockService }],
    }).compile();

    controller = module.get<AdminRecruitersController>(
      AdminRecruitersController,
    );
    service = module.get(AdminRecruitersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listRecruiters', () => {
    it('should call service.listRecruiters with page and limit', () => {
      controller.listRecruiters(2, 10);
      expect(service.listRecruiters).toHaveBeenCalledWith(2, 10);
    });
  });

  describe('inviteRecruiter', () => {
    it('should call service.inviteRecruiter with dto fields', () => {
      const dto: InviteRecruiterDto = {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
      };
      controller.inviteRecruiter(dto);
      expect(service.inviteRecruiter).toHaveBeenCalledWith(
        'Jane',
        'Doe',
        'jane@example.com',
      );
    });
  });

  describe('deactivateRecruiter', () => {
    it('should call service.deactivateRecruiter with id', () => {
      controller.deactivateRecruiter(5);
      expect(service.deactivateRecruiter).toHaveBeenCalledWith(5);
    });
  });

  describe('reactivateRecruiter', () => {
    it('should call service.reactivateRecruiter with id', () => {
      controller.reactivateRecruiter(5);
      expect(service.reactivateRecruiter).toHaveBeenCalledWith(5);
    });
  });
});
