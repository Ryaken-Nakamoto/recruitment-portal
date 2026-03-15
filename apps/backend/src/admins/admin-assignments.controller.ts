import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Auth } from '../auth/decorators/auth.decorator';
import { Role } from '../users/role';
import { ApplicationRound } from '../applications/enums/application-round.enum';
import { AdminAssignmentsService } from './admin-assignments.service';
import { ExecuteAssignmentDto } from './dto/execute-assignment.dto';
import { AddReviewerDto } from './dto/add-reviewer.dto';

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
    );
  }

  @Get('application/:applicationId/reviews')
  @Auth(Role.ADMIN)
  getApplicationReviews(
    @Param('applicationId', ParseIntPipe) applicationId: number,
  ) {
    return this.adminAssignmentsService.getApplicationReviews(applicationId);
  }

  @Get('application/:applicationId')
  @Auth(Role.ADMIN)
  getApplicationAssignments(
    @Param('applicationId', ParseIntPipe) applicationId: number,
  ) {
    return this.adminAssignmentsService.getApplicationAssignments(
      applicationId,
    );
  }

  @Post('add')
  @Auth(Role.ADMIN)
  addReviewer(@Body() dto: AddReviewerDto) {
    return this.adminAssignmentsService.addReviewer(
      dto.applicationId,
      dto.recruiterId,
    );
  }

  @Delete(':assignmentId')
  @Auth(Role.ADMIN)
  removeReviewer(
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @Query('force', new ParseBoolPipe({ optional: true })) force?: boolean,
  ) {
    return this.adminAssignmentsService.removeReviewer(
      assignmentId,
      force ?? false,
    );
  }
}
