import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Auth } from '../auth/decorators/auth.decorator';
import { Role } from '../users/role';
import { ApplicationRound } from '../applications/enums/application-round.enum';
import { AdminAssignmentsService } from './admin-assignments.service';
import { ExecuteAssignmentDto } from './dto/execute-assignment.dto';

@ApiTags('Admin - Assignments')
@Controller('admin/assignments')
export class AdminAssignmentsController {
  constructor(
    private readonly adminAssignmentsService: AdminAssignmentsService,
  ) {}

  @Get('applications')
  @Auth(Role.ADMIN)
  listApplicationsByRound(@Query('round') round?: ApplicationRound) {
    return this.adminAssignmentsService.listApplicationsByRound(round);
  }

  @Get('recruiters')
  @Auth(Role.ADMIN)
  listActiveRecruiters() {
    return this.adminAssignmentsService.listActiveRecruiters();
  }

  @Post('execute')
  @Auth(Role.ADMIN)
  executeAssignment(@Body() dto: ExecuteAssignmentDto) {
    return this.adminAssignmentsService.assignRecruiters(
      dto.applicationIds,
      dto.recruiterIds,
      dto.recruitersPerApp,
      dto.force,
    );
  }
}
