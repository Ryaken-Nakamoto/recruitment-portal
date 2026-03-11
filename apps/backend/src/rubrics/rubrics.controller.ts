import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RubricsService } from './rubrics.service';
import { Auth } from '../auth/decorators/auth.decorator';
import { Role } from '../users/role';

@ApiTags('Rubrics')
@Controller('rubrics')
export class RubricsController {
  constructor(private readonly rubricsService: RubricsService) {}

  @Get()
  @Auth(Role.ADMIN)
  findAll() {
    return this.rubricsService.findAll();
  }
}
