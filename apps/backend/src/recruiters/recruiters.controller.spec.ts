import { Test, TestingModule } from '@nestjs/testing';
import { RecruitersController } from './recruiters.controller';
import { RecruitersService } from './recruiters.service';

describe('RecruitersController', () => {
  let controller: RecruitersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecruitersController],
      providers: [RecruitersService],
    }).compile();

    controller = module.get<RecruitersController>(RecruitersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
