import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScreeningRubric } from './entities/screening-rubric.entity';
import { InterviewRubric } from './entities/interview-rubric.entity';

@Injectable()
export class RubricsService {
  private readonly logger = new Logger(RubricsService.name);

  constructor(
    @InjectRepository(ScreeningRubric)
    private readonly screeningRubricRepo: Repository<ScreeningRubric>,
    @InjectRepository(InterviewRubric)
    private readonly interviewRubricRepo: Repository<InterviewRubric>,
  ) {}

  async findAll() {
    const [screening, interview] = await Promise.all([
      this.screeningRubricRepo.find({ relations: ['criteria'] }),
      this.interviewRubricRepo.find({ relations: ['criteria'] }),
    ]);

    this.logger.log(
      `Fetched ${screening.length} screening and ${interview.length} interview rubrics`,
    );

    return { screening, interview };
  }
}
