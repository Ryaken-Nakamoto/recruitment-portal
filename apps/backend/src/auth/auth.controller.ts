import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from './decorators/auth.decorator';
import { ReqUser } from './decorators/user.decorator';
import { Role } from '../users/role';
import { User } from '../users/user.entity';
import { AccountStatus } from '../users/status';
import { UsersService } from '../users/users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly usersService: UsersService) {}

  @Get('/me')
  @Auth(Role.ADMIN, Role.RECRUITER)
  getMe(@ReqUser() user: User): User {
    return user;
  }

  @Patch('/profile')
  @Auth(Role.ADMIN, Role.RECRUITER)
  async updateProfile(
    @ReqUser() user: User,
    @Body() dto: UpdateProfileDto,
  ): Promise<User> {
    const updated = await this.usersService.update(user.id, dto);
    if (
      updated.accountStatus === AccountStatus.INVITE_SENT &&
      updated.firstName !== null &&
      updated.lastName !== null
    ) {
      return this.usersService.update(user.id, {
        accountStatus: AccountStatus.ACTIVATED,
      });
    }
    return updated;
  }
}
