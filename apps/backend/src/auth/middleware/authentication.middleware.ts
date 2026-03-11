import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { AuthService } from '../auth.service';
import { PossiblyAuthorizedRequest } from '../types/authorized-request';
// ─── DEV ONLY ─ remove before shipping ───────────────────────────────────────
import { AccountStatus } from '../../users/status';
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class AuthenticationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuthenticationMiddleware.name);

  constructor(private readonly authService: AuthService) {}

  async use(
    req: PossiblyAuthorizedRequest,
    _res: Response,
    next: NextFunction,
  ) {
    // ─── DEV ONLY ─ remove before shipping ─────────────────────────────────────
    if (process.env.DEV_AUTH_BYPASS === 'true') {
      const devEmail = req.headers['x-dev-user-email'] as string | undefined;
      if (devEmail) {
        const user = await this.authService.findUserByEmail(devEmail);
        if (user && user.accountStatus !== AccountStatus.DEACTIVATED) {
          req.user = user;
          this.logger.warn(
            `DEV BYPASS: acting as ${user.email} (${user.role})`,
          );
        } else {
          this.logger.warn(
            `DEV BYPASS: no active user found for email "${devEmail}"`,
          );
        }
      }
      return next();
    }
    // ─────────────────────────────────────────────────────────────────────────────

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      this.logger.debug(`No Authorization header on ${req.method} ${req.path}`);
      return next();
    }

    if (!authHeader.startsWith('Bearer ')) {
      this.logger.warn(
        `Malformed Authorization header on ${req.method} ${req.path}`,
      );
      return next();
    }

    const token = authHeader.slice(7);
    try {
      req.user = await this.authService.verifyJwt(token);
      this.logger.log(
        `Authenticated user ${req.user.email} on ${req.method} ${req.path}`,
      );
    } catch (error) {
      this.logger.error(
        `JWT verification failed on ${req.method} ${req.path}: ${error.message}`,
      );
    }

    next();
  }
}
