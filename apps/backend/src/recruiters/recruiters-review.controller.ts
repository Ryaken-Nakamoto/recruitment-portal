import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

import { Auth } from '../auth/decorators/auth.decorator';
import { ReqUser } from '../auth/decorators/user.decorator';
import { Role } from '../users/role';
import { Recruiter } from './entities/recruiter.entity';
import { RecruitersReviewService } from './recruiters-review.service';
import { SaveScreeningReviewDto } from './dto/save-screening-review.dto';
import {
  ApproveInterviewReviewDto,
  SaveInterviewReviewDto,
} from './dto/save-interview-review.dto';

class UpdateNotesDto {
  @IsOptional()
  @IsString()
  notes: string | null;
}

@ApiTags('Recruiter - Reviews')
@Controller('recruiter')
export class RecruitersReviewController {
  constructor(private readonly reviewService: RecruitersReviewService) {}

  @Get('assignments')
  @Auth(Role.RECRUITER)
  listAssignments(
    @ReqUser() user: Recruiter,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.reviewService.listAssignments(
      user,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  @Get('applications/:applicationId')
  @Auth(Role.RECRUITER)
  getApplicationDetail(
    @Param('applicationId', ParseIntPipe) applicationId: number,
    @ReqUser() user: Recruiter,
  ) {
    return this.reviewService.getApplicationDetailForRecruiter(
      applicationId,
      user,
    );
  }

  @Get('assignments/by-application/:applicationId/co-reviewers')
  @Auth(Role.RECRUITER)
  getCoReviewers(
    @Param('applicationId', ParseIntPipe) applicationId: number,
    @ReqUser() user: Recruiter,
  ) {
    return this.reviewService.getCoReviewers(applicationId, user);
  }

  @Get('assignments/by-application/:applicationId')
  @Auth(Role.RECRUITER)
  getAssignmentByApplication(
    @Param('applicationId', ParseIntPipe) applicationId: number,
    @ReqUser() user: Recruiter,
  ) {
    return this.reviewService.getAssignmentByApplication(applicationId, user);
  }

  @Get('assignments/completed')
  @Auth(Role.RECRUITER)
  listCompletedAssignments(
    @ReqUser() user: Recruiter,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.reviewService.listCompletedAssignments(
      user,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  @Get('assignments/completed/:assignmentId')
  @Auth(Role.RECRUITER)
  getCompletedAssignmentDetail(
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @ReqUser() user: Recruiter,
  ) {
    return this.reviewService.getCompletedAssignmentDetail(assignmentId, user);
  }

  @Get('assignments/:assignmentId')
  @Auth(Role.RECRUITER)
  getAssignmentDetail(
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @ReqUser() user: Recruiter,
  ) {
    return this.reviewService.getAssignmentDetail(assignmentId, user);
  }

  @Patch('assignments/:assignmentId/notes')
  @Auth(Role.RECRUITER)
  updateNotes(
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @Body() dto: UpdateNotesDto,
    @ReqUser() user: Recruiter,
  ) {
    return this.reviewService.updateNotes(assignmentId, dto.notes, user);
  }

  @Post('reviews/screening')
  @Auth(Role.RECRUITER)
  saveScreeningReview(
    @Body() dto: SaveScreeningReviewDto,
    @ReqUser() user: Recruiter,
  ) {
    return this.reviewService.saveScreeningReview(dto, user);
  }

  @Patch('reviews/screening/:id/submit')
  @Auth(Role.RECRUITER)
  submitScreeningReview(
    @Param('id', ParseIntPipe) id: number,
    @ReqUser() user: Recruiter,
  ) {
    return this.reviewService.submitScreeningReview(id, user);
  }

  @Post('reviews/interview')
  @Auth(Role.RECRUITER)
  saveInterviewReview(
    @Body() dto: SaveInterviewReviewDto,
    @ReqUser() user: Recruiter,
  ) {
    return this.reviewService.saveInterviewReview(dto, user);
  }

  @Patch('reviews/interview/:id/submit')
  @Auth(Role.RECRUITER)
  submitInterviewReview(
    @Param('id', ParseIntPipe) id: number,
    @ReqUser() user: Recruiter,
  ) {
    return this.reviewService.submitInterviewReview(id, user);
  }

  @Patch('reviews/interview/:id/approve')
  @Auth(Role.RECRUITER)
  approveInterviewReview(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveInterviewReviewDto,
    @ReqUser() user: Recruiter,
  ) {
    return this.reviewService.approveInterviewReview(id, dto.approved, user);
  }
}
