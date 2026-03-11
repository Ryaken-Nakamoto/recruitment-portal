import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from './decorators/auth.decorator';
import { ReqUser } from './decorators/user.decorator';
import { Role } from '../users/role';
import { User } from '../users/user.entity';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  @Get('/me')
  @Auth(Role.ADMIN, Role.RECRUITER)
  getMe(@ReqUser() user: User): User {
    return user;
  }
}
