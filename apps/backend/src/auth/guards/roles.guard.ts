import {
  CanActivate,
  ExecutionContext,
  Logger,
  UnauthorizedException,
  mixin,
  Type,
} from '@nestjs/common';
import { Role, ROLE_HIERARCHY } from '../../users/role';
import { DefinitelyAuthorizedRequest } from '../types/authorized-request';

export function RolesGuard(roles: Role[]): Type<CanActivate> {
  class RolesGuardMixin implements CanActivate {
    private readonly logger = new Logger('RolesGuard');

    canActivate(context: ExecutionContext): boolean {
      const request = context
        .switchToHttp()
        .getRequest<DefinitelyAuthorizedRequest>();
      const user = request.user;

      if (!user) {
        this.logger.error(
          'No user on request — middleware did not authenticate',
        );
        throw new UnauthorizedException();
      }

      const userRoles = ROLE_HIERARCHY[user.role] ?? [];
      const hasRole = roles.some((role) => userRoles.includes(role));

      this.logger.log(
        `User role: "${user.role}", allowed roles: ${JSON.stringify(
          roles,
        )}, hierarchy grants: ${JSON.stringify(
          userRoles,
        )}, hasRole: ${hasRole}`,
      );

      if (!hasRole) {
        throw new UnauthorizedException();
      }

      return true;
    }
  }

  return mixin(RolesGuardMixin);
}
