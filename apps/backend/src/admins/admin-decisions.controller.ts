import { Body, Controller, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Auth } from '../auth/decorators/auth.decorator';
import { Role } from '../users/role';
import { AdminDecisionsService } from './admin-decisions.service';
import { MakeDecisionDto } from './dto/make-decision.dto';

@ApiTags('Admin - Decisions')
@Controller('admin/applications')
export class AdminDecisionsController {
  constructor(private readonly adminDecisionsService: AdminDecisionsService) {}

  @Patch(':id/decide')
  @Auth(Role.ADMIN)
  makeDecision(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MakeDecisionDto,
  ): Promise<void> {
    return this.adminDecisionsService.makeDecision(id, dto);
  }

  @Patch(':id/send-email')
  @Auth(Role.ADMIN)
  sendEmail(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.adminDecisionsService.sendEmail(id);
  }
}
