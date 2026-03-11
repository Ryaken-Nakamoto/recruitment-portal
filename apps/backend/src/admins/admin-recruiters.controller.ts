import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Auth } from '../auth/decorators/auth.decorator';
import { Role } from '../users/role';
import { AdminRecruitersService } from './admin-recruiters.service';
import { InviteRecruiterDto } from './dto/invite-recruiter.dto';

@ApiTags('Admin - Recruiters')
@Controller('admin/recruiters')
export class AdminRecruitersController {
  constructor(
    private readonly adminRecruitersService: AdminRecruitersService,
  ) {}

  @Get()
  @Auth(Role.ADMIN)
  listRecruiters(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.adminRecruitersService.listRecruiters(page, limit);
  }

  @Post('invite')
  @Auth(Role.ADMIN)
  inviteRecruiter(@Body() dto: InviteRecruiterDto) {
    return this.adminRecruitersService.inviteRecruiter(
      dto.firstName,
      dto.lastName,
      dto.email,
    );
  }

  @Patch(':id/deactivate')
  @Auth(Role.ADMIN)
  deactivateRecruiter(@Param('id', ParseIntPipe) id: number) {
    return this.adminRecruitersService.deactivateRecruiter(id);
  }

  @Patch(':id/reactivate')
  @Auth(Role.ADMIN)
  reactivateRecruiter(@Param('id', ParseIntPipe) id: number) {
    return this.adminRecruitersService.reactivateRecruiter(id);
  }
}
