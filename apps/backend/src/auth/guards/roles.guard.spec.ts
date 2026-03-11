import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { Role } from '../../users/role';
import { User } from '../../users/user.entity';
import { AccountStatus } from '../../users/status';

const makeContext = (user: User | undefined): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as ExecutionContext);

const makeUser = (role: Role): User =>
  ({
    id: 1,
    email: 'test@example.com',
    role,
    accountStatus: AccountStatus.ACTIVATED,
  } as User);

describe('RolesGuard', () => {
  it('throws UnauthorizedException when no user is on the request', () => {
    const guard = new (RolesGuard([Role.RECRUITER]))();

    expect(() => guard.canActivate(makeContext(undefined))).toThrow(
      UnauthorizedException,
    );
  });

  it('allows a recruiter to access a recruiter-only route', () => {
    const guard = new (RolesGuard([Role.RECRUITER]))();

    expect(guard.canActivate(makeContext(makeUser(Role.RECRUITER)))).toBe(true);
  });

  it('allows an admin to access an admin-only route', () => {
    const guard = new (RolesGuard([Role.ADMIN]))();

    expect(guard.canActivate(makeContext(makeUser(Role.ADMIN)))).toBe(true);
  });

  it('allows an admin to access a recruiter route via role hierarchy', () => {
    const guard = new (RolesGuard([Role.RECRUITER]))();

    expect(guard.canActivate(makeContext(makeUser(Role.ADMIN)))).toBe(true);
  });

  it('throws UnauthorizedException when a recruiter tries to access an admin-only route', () => {
    const guard = new (RolesGuard([Role.ADMIN]))();

    expect(() =>
      guard.canActivate(makeContext(makeUser(Role.RECRUITER))),
    ).toThrow(UnauthorizedException);
  });
});
