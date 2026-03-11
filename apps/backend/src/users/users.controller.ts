import { Controller, Delete, Get, Param, ParseIntPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { Auth } from '../auth/decorators/auth.decorator';
import { Role } from './role';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('/:userId')
  @Auth(Role.ADMIN, Role.RECRUITER)
  async getUser(@Param('userId', ParseIntPipe) userId: number): Promise<User> {
    return this.usersService.findOne(userId);
  }

  @Delete('/:id')
  @Auth(Role.ADMIN)
  removeUser(@Param('id') id: string) {
    return this.usersService.remove(parseInt(id));
  }
}
