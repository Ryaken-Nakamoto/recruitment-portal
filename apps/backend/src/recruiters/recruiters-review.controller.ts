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

  @Post('reviews/screening')
  @Auth(Role.RECRUITER)
  submitScreeningReview(
    @Body() dto: SaveScreeningReviewDto,
    @ReqUser() user: Recruiter,
  ) {
    return this.reviewService.submitScreeningReview(dto, user);
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
