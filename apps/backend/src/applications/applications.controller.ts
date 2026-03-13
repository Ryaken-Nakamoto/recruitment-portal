import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Readable } from 'stream';

import { Auth } from '../auth/decorators/auth.decorator';
import { Role } from '../users/role';
import { ApplicationsService } from './applications.service';

@ApiTags('Admin - Applications')
@Controller('admin/applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get()
  @Auth(Role.ADMIN)
  listAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.applicationsService.listAll(page, limit);
  }

  @Get(':id')
  @Auth(Role.ADMIN)
  findOneDetail(@Param('id', ParseIntPipe) id: number) {
    return this.applicationsService.findOneDetail(id);
  }

  @Get(':id/resume')
  @Auth(Role.ADMIN)
  async downloadResume(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { stream, filename } = await this.applicationsService.getResumeStream(
      id,
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    return new StreamableFile(stream as unknown as Readable);
  }
}
