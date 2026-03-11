import { Test, TestingModule } from '@nestjs/testing';
import { RubricsController } from './rubrics.controller';
import { RubricsService } from './rubrics.service';

const mockRubricsService = { findAll: jest.fn() };

describe('RubricsController', () => {
  let controller: RubricsController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RubricsController],
      providers: [{ provide: RubricsService, useValue: mockRubricsService }],
    }).compile();

    controller = module.get<RubricsController>(RubricsController);
  });

  it('delegates findAll to RubricsService', async () => {
    const expected = { screening: [], interview: [] };
    mockRubricsService.findAll.mockResolvedValue(expected);

    const result = await controller.findAll();

    expect(result).toBe(expected);
    expect(mockRubricsService.findAll).toHaveBeenCalledTimes(1);
  });
});
