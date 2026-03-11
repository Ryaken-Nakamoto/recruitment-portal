import { Response, NextFunction } from 'express';
import { AuthenticationMiddleware } from './authentication.middleware';
import { AuthService } from '../auth.service';
import { PossiblyAuthorizedRequest } from '../types/authorized-request';
import { User } from '../../users/user.entity';
import { Role } from '../../users/role';
import { AccountStatus } from '../../users/status';

const mockAuthService = {
  verifyJwt: jest.fn(),
  // ─── DEV ONLY ─ remove before shipping ───────────────────────────────────────
  findUserByEmail: jest.fn(),
  // ─────────────────────────────────────────────────────────────────────────────
} as unknown as AuthService;

const makeUser = (): User =>
  ({
    id: 1,
    email: 'test@example.com',
    role: Role.RECRUITER,
    accountStatus: AccountStatus.ACTIVATED,
  } as User);

describe('AuthenticationMiddleware', () => {
  let middleware: AuthenticationMiddleware;
  let next: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    middleware = new AuthenticationMiddleware(mockAuthService);
    next = jest.fn();
  });

  it('calls next() and does not set req.user when Authorization header is absent', async () => {
    const req = {
      headers: {},
      method: 'GET',
      path: '/test',
    } as unknown as PossiblyAuthorizedRequest;

    await middleware.use(req, {} as unknown as Response, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeUndefined();
    expect(mockAuthService.verifyJwt).not.toHaveBeenCalled();
  });

  it('calls next() and does not set req.user when Authorization header is malformed', async () => {
    const req = {
      headers: { authorization: 'Token abc123' },
      method: 'GET',
      path: '/test',
    } as unknown as PossiblyAuthorizedRequest;

    await middleware.use(req, {} as unknown as Response, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeUndefined();
    expect(mockAuthService.verifyJwt).not.toHaveBeenCalled();
  });

  it('sets req.user and calls next() when token is valid', async () => {
    const user = makeUser();
    (mockAuthService.verifyJwt as jest.Mock).mockResolvedValue(user);
    const req = {
      headers: { authorization: 'Bearer valid-token' },
      method: 'GET',
      path: '/test',
    } as unknown as PossiblyAuthorizedRequest;

    await middleware.use(req, {} as unknown as Response, next);

    expect(mockAuthService.verifyJwt).toHaveBeenCalledWith('valid-token');
    expect(req.user).toBe(user);
    expect(next).toHaveBeenCalled();
  });

  it('does not set req.user but still calls next() when token verification fails', async () => {
    (mockAuthService.verifyJwt as jest.Mock).mockRejectedValue(
      new Error('bad token'),
    );
    const req = {
      headers: { authorization: 'Bearer invalid-token' },
      method: 'GET',
      path: '/test',
    } as unknown as PossiblyAuthorizedRequest;

    await middleware.use(req, {} as unknown as Response, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  // ─── DEV ONLY ─ remove before shipping ───────────────────────────────────────
  describe('dev bypass (DEV_AUTH_BYPASS=true)', () => {
    beforeEach(() => {
      process.env.DEV_AUTH_BYPASS = 'true';
    });

    afterEach(() => {
      delete process.env.DEV_AUTH_BYPASS;
    });

    it('sets req.user from X-Dev-User-Email when user exists and is active', async () => {
      const user = makeUser();
      (mockAuthService.findUserByEmail as jest.Mock).mockResolvedValue(user);
      const req = {
        headers: { 'x-dev-user-email': 'test@example.com' },
        method: 'GET',
        path: '/test',
      } as unknown as PossiblyAuthorizedRequest;

      await middleware.use(req, {} as unknown as Response, next);

      expect(mockAuthService.findUserByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(req.user).toBe(user);
      expect(next).toHaveBeenCalled();
      expect(mockAuthService.verifyJwt).not.toHaveBeenCalled();
    });

    it('does not set req.user when X-Dev-User-Email header is absent', async () => {
      const req = {
        headers: {},
        method: 'GET',
        path: '/test',
      } as unknown as PossiblyAuthorizedRequest;

      await middleware.use(req, {} as unknown as Response, next);

      expect(mockAuthService.findUserByEmail).not.toHaveBeenCalled();
      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('does not set req.user when the user is not found in the DB', async () => {
      (mockAuthService.findUserByEmail as jest.Mock).mockResolvedValue(null);
      const req = {
        headers: { 'x-dev-user-email': 'ghost@dev.local' },
        method: 'GET',
        path: '/test',
      } as unknown as PossiblyAuthorizedRequest;

      await middleware.use(req, {} as unknown as Response, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('does not set req.user when the user is deactivated', async () => {
      const deactivated = {
        ...makeUser(),
        accountStatus: AccountStatus.DEACTIVATED,
      };
      (mockAuthService.findUserByEmail as jest.Mock).mockResolvedValue(
        deactivated,
      );
      const req = {
        headers: { 'x-dev-user-email': 'inactive@dev.local' },
        method: 'GET',
        path: '/test',
      } as unknown as PossiblyAuthorizedRequest;

      await middleware.use(req, {} as unknown as Response, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('skips JWT path entirely even when Authorization header is also present', async () => {
      const user = makeUser();
      (mockAuthService.findUserByEmail as jest.Mock).mockResolvedValue(user);
      const req = {
        headers: {
          'x-dev-user-email': 'test@example.com',
          authorization: 'Bearer some-token',
        },
        method: 'GET',
        path: '/test',
      } as unknown as PossiblyAuthorizedRequest;

      await middleware.use(req, {} as unknown as Response, next);

      expect(mockAuthService.verifyJwt).not.toHaveBeenCalled();
      expect(req.user).toBe(user);
    });
  });
  // ─────────────────────────────────────────────────────────────────────────────
});
