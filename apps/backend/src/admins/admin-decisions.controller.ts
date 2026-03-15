import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Auth } from '../auth/decorators/auth.decorator';
import { Role } from '../users/role';
import { AdminDecisionsService } from './admin-decisions.service';
import { MakeDecisionDto } from './dto/make-decision.dto';
import { BulkDecideDto } from './dto/bulk-decide.dto';
import { SendEmailDto } from './dto/send-email.dto';
import { EmailPreviewDto } from './dto/email-preview.dto';

@ApiTags('Admin - Decisions')
@Controller('admin')
export class AdminDecisionsController {
  constructor(private readonly adminDecisionsService: AdminDecisionsService) {}

  @Patch('applications/bulk-decide')
  @Auth(Role.ADMIN)
  bulkDecide(@Body() dto: BulkDecideDto) {
    return this.adminDecisionsService.bulkDecide(dto);
  }

  @Patch('applications/:id/decide')
  @Auth(Role.ADMIN)
  makeDecision(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MakeDecisionDto,
  ): Promise<void> {
    return this.adminDecisionsService.makeDecision(id, dto);
  }

  @Get('applications/:id/email-preview')
  @Auth(Role.ADMIN)
  getEmailPreview(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<EmailPreviewDto> {
    return this.adminDecisionsService.getEmailPreview(id);
  }

  @Patch('applications/:id/send-email')
  @Auth(Role.ADMIN)
  sendEmail(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendEmailDto,
  ): Promise<void> {
    return this.adminDecisionsService.sendEmail(id, dto);
  }

  @Get('sent-emails')
  @Auth(Role.ADMIN)
  getSentEmails(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.adminDecisionsService.getSentEmails(
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  @Get('sent-emails/:id')
  @Auth(Role.ADMIN)
  getSentEmail(@Param('id', ParseIntPipe) id: number) {
    return this.adminDecisionsService.getSentEmail(id);
  }
}
