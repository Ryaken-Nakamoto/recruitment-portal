import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RubricsService } from './rubrics.service';
import { ScreeningRubric } from './entities/screening-rubric.entity';
import { InterviewRubric } from './entities/interview-rubric.entity';

const mockScreeningRubricRepo = { find: jest.fn() };
const mockInterviewRubricRepo = { find: jest.fn() };

describe('RubricsService', () => {
  let service: RubricsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RubricsService,
        {
          provide: getRepositoryToken(ScreeningRubric),
          useValue: mockScreeningRubricRepo,
        },
        {
          provide: getRepositoryToken(InterviewRubric),
          useValue: mockInterviewRubricRepo,
        },
      ],
    }).compile();

    service = module.get<RubricsService>(RubricsService);
  });

  describe('findAll', () => {
    it('returns screening and interview rubrics with their criteria', async () => {
      const screeningRubrics = [
        { id: 1, name: 'Developer Application Rubric', criteria: [] },
      ];
      const interviewRubrics = [
        { id: 1, name: 'Behavioral', criteria: [] },
        { id: 2, name: 'Technical', criteria: [] },
      ];

      mockScreeningRubricRepo.find.mockResolvedValue(screeningRubrics);
      mockInterviewRubricRepo.find.mockResolvedValue(interviewRubrics);

      const result = await service.findAll();

      expect(result).toEqual({
        screening: screeningRubrics,
        interview: interviewRubrics,
      });
      expect(mockScreeningRubricRepo.find).toHaveBeenCalledWith({
        relations: ['criteria'],
      });
      expect(mockInterviewRubricRepo.find).toHaveBeenCalledWith({
        relations: ['criteria'],
      });
    });

    it('returns empty arrays when no rubrics exist', async () => {
      mockScreeningRubricRepo.find.mockResolvedValue([]);
      mockInterviewRubricRepo.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual({ screening: [], interview: [] });
    });

    it('fetches both rubric types in parallel', async () => {
      mockScreeningRubricRepo.find.mockResolvedValue([]);
      mockInterviewRubricRepo.find.mockResolvedValue([]);

      await service.findAll();

      expect(mockScreeningRubricRepo.find).toHaveBeenCalledTimes(1);
      expect(mockInterviewRubricRepo.find).toHaveBeenCalledTimes(1);
    });
  });
});
