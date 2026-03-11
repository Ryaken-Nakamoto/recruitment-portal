import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CognitoService } from '../util/cognito/cognito.service';
import { User } from '../users/user.entity';
import { AccountStatus } from '../users/status';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly cognitoService: CognitoService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  // ─── DEV ONLY ─ remove before shipping ───────────────────────────────────────
  async findUserByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOneBy({ email });
  }
  // ─────────────────────────────────────────────────────────────────────────────

  async verifyJwt(token: string): Promise<User> {
    let payload: Record<string, unknown>;

    try {
      payload = await this.cognitoService.validateToken(token);
      this.logger.log(
        `Token validated, claims: ${JSON.stringify({
          email: payload.email,
          token_use: payload.token_use,
          aud: payload.aud,
        })}`,
      );
    } catch (error) {
      this.logger.error(`Cognito token validation failed: ${error.message}`);
      throw new UnauthorizedException('Invalid token');
    }

    const email = payload.email as string;
    if (!email) {
      this.logger.error(
        `Token has no email claim. Payload keys: ${Object.keys(payload).join(
          ', ',
        )}`,
      );
      throw new UnauthorizedException('Token missing email claim');
    }

    const user = await this.userRepo.findOneBy({ email });
    if (!user) {
      this.logger.error(`No user found in DB for email: ${email}`);
      throw new UnauthorizedException('User not found');
    }

    if (user.accountStatus === AccountStatus.DEACTIVATED) {
      this.logger.warn(`Deactivated user attempted login: ${email}`);
      throw new UnauthorizedException('Account is deactivated');
    }

    if (user.accountStatus === AccountStatus.INVITE_SENT) {
      user.accountStatus = AccountStatus.ACTIVATED;
      await this.userRepo.save(user);
    }

    return user;
  }
}
