import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.entity';
import { Role } from '../users/role';
import { AccountStatus } from '../users/status';
import { UpdateProfileDto } from './dto/update-profile.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let usersService: jest.Mocked<UsersService>;

  const mockUser: User = {
    id: 1,
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    role: Role.RECRUITER,
    accountStatus: AccountStatus.ACTIVATED,
    createdDate: new Date('2025-01-01'),
  };

  beforeEach(async () => {
    const mockUsersService = {
      update: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    usersService = module.get(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMe', () => {
    it('should return the current user', () => {
      const result = controller.getMe(mockUser);
      expect(result).toBe(mockUser);
    });
  });

  describe('updateProfile', () => {
    it('should call usersService.update with the user id and dto', async () => {
      const dto: UpdateProfileDto = { firstName: 'John', lastName: 'Smith' };
      const updated = { ...mockUser, firstName: 'John', lastName: 'Smith' };
      usersService.update.mockResolvedValue(updated as unknown as User);

      const result = await controller.updateProfile(mockUser, dto);

      expect(usersService.update).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(updated);
    });

    it('should allow updating only firstName', async () => {
      const dto: UpdateProfileDto = { firstName: 'John' };
      const updated = { ...mockUser, firstName: 'John' };
      usersService.update.mockResolvedValue(updated as unknown as User);

      await controller.updateProfile(mockUser, dto);

      expect(usersService.update).toHaveBeenCalledWith(1, dto);
    });

    it('should allow updating only lastName', async () => {
      const dto: UpdateProfileDto = { lastName: 'Smith' };
      const updated = { ...mockUser, lastName: 'Smith' };
      usersService.update.mockResolvedValue(updated as unknown as User);

      await controller.updateProfile(mockUser, dto);

      expect(usersService.update).toHaveBeenCalledWith(1, dto);
    });

    it('activates an INVITE_SENT user when profile is completed with both names', async () => {
      const invitedUser: User = {
        ...mockUser,
        accountStatus: AccountStatus.INVITE_SENT,
      };
      const updatedWithNames: User = {
        ...invitedUser,
        firstName: 'John',
        lastName: 'Smith',
      };
      const activated: User = {
        ...updatedWithNames,
        accountStatus: AccountStatus.ACTIVATED,
      };

      usersService.update
        .mockResolvedValueOnce(updatedWithNames)
        .mockResolvedValueOnce(activated);

      const dto: UpdateProfileDto = { firstName: 'John', lastName: 'Smith' };
      const result = await controller.updateProfile(invitedUser, dto);

      expect(usersService.update).toHaveBeenCalledTimes(2);
      expect(usersService.update).toHaveBeenNthCalledWith(2, 1, {
        accountStatus: AccountStatus.ACTIVATED,
      });
      expect(result.accountStatus).toBe(AccountStatus.ACTIVATED);
    });

    it('does not activate a user who is already ACTIVATED', async () => {
      const dto: UpdateProfileDto = { firstName: 'John', lastName: 'Smith' };
      const updated = { ...mockUser, firstName: 'John', lastName: 'Smith' };
      usersService.update.mockResolvedValue(updated as unknown as User);

      const result = await controller.updateProfile(mockUser, dto);

      expect(usersService.update).toHaveBeenCalledTimes(1);
      expect(result.accountStatus).toBe(AccountStatus.ACTIVATED);
    });
  });
});
