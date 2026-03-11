import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EmailsService } from './emails.service';
import { UpdateEmailDto } from './dto/update-email.dto';
import { Auth } from '../auth/decorators/auth.decorator';
import { Role } from '../users/role';

@ApiTags('Emails')
@Controller('emails')
export class EmailsController {
  constructor(private readonly emailsService: EmailsService) {}

  @Get()
  @Auth(Role.ADMIN)
  findAll() {
    return this.emailsService.findAll();
  }

  @Get('variables')
  @Auth(Role.ADMIN)
  getAutoVariables() {
    return this.emailsService.getAutoVariables();
  }

  @Get(':id')
  @Auth(Role.ADMIN)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.emailsService.findOne(id);
  }

  @Patch(':id')
  @Auth(Role.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEmailDto) {
    return this.emailsService.update(id, dto);
  }
}
