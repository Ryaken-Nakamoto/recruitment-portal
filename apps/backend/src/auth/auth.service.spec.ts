import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { CognitoService } from '../util/cognito/cognito.service';
import { User } from '../users/user.entity';
import { AccountStatus } from '../users/status';
import { Role } from '../users/role';

const mockCognitoService = { validateToken: jest.fn() };
const mockUserRepo = { findOneBy: jest.fn(), save: jest.fn() };

const makeUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 1,
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    role: Role.RECRUITER,
    accountStatus: AccountStatus.ACTIVATED,
    createdDate: new Date(),
    ...overrides,
  } as User);

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: CognitoService, useValue: mockCognitoService },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('verifyJwt', () => {
    it('returns the user when token is valid and account is activated', async () => {
      const user = makeUser();
      mockCognitoService.validateToken.mockResolvedValue({ email: user.email });
      mockUserRepo.findOneBy.mockResolvedValue(user);

      const result = await service.verifyJwt('valid-token');

      expect(result).toBe(user);
      expect(mockUserRepo.save).not.toHaveBeenCalled();
    });

    it('activates an INVITE_SENT user on first login and returns the updated user', async () => {
      const user = makeUser({ accountStatus: AccountStatus.INVITE_SENT });
      mockCognitoService.validateToken.mockResolvedValue({ email: user.email });
      mockUserRepo.findOneBy.mockResolvedValue(user);
      mockUserRepo.save.mockResolvedValue({
        ...user,
        accountStatus: AccountStatus.ACTIVATED,
      });

      const result = await service.verifyJwt('valid-token');

      expect(user.accountStatus).toBe(AccountStatus.ACTIVATED);
      expect(mockUserRepo.save).toHaveBeenCalledWith(user);
      expect(result).toBeDefined();
    });

    it('throws UnauthorizedException for a DEACTIVATED user', async () => {
      const user = makeUser({ accountStatus: AccountStatus.DEACTIVATED });
      mockCognitoService.validateToken.mockResolvedValue({ email: user.email });
      mockUserRepo.findOneBy.mockResolvedValue(user);

      await expect(service.verifyJwt('valid-token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockUserRepo.save).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when Cognito token validation fails', async () => {
      mockCognitoService.validateToken.mockRejectedValue(
        new Error('Invalid token'),
      );

      await expect(service.verifyJwt('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockUserRepo.findOneBy).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when token has no email claim', async () => {
      mockCognitoService.validateToken.mockResolvedValue({ token_use: 'id' });

      await expect(service.verifyJwt('token-without-email')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockUserRepo.findOneBy).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when user is not found in the database', async () => {
      mockCognitoService.validateToken.mockResolvedValue({
        email: 'ghost@example.com',
      });
      mockUserRepo.findOneBy.mockResolvedValue(null);

      await expect(service.verifyJwt('valid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
