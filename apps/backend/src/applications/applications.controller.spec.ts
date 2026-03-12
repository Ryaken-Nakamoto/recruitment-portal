import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { ApplicationsListResponseDto } from './dto/application-list-item.dto';

describe('ApplicationsController', () => {
  let controller: ApplicationsController;
  let service: jest.Mocked<ApplicationsService>;

  beforeEach(async () => {
    const mockService = {
      listAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApplicationsController],
      providers: [
        {
          provide: ApplicationsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<ApplicationsController>(ApplicationsController);
    service = module.get(
      ApplicationsService,
    ) as jest.Mocked<ApplicationsService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listAll', () => {
    it('delegates to service with default pagination', async () => {
      const mockResponse: ApplicationsListResponseDto = {
        data: [],
        total: 0,
        page: 1,
        totalPages: 0,
      };
      service.listAll.mockResolvedValue(mockResponse);

      const result = await controller.listAll(1, 20);

      expect(service.listAll).toHaveBeenCalledWith(1, 20);
      expect(result).toEqual(mockResponse);
    });

    it('delegates to service with custom pagination', async () => {
      const mockResponse: ApplicationsListResponseDto = {
        data: [],
        total: 50,
        page: 2,
        totalPages: 3,
      };
      service.listAll.mockResolvedValue(mockResponse);

      const result = await controller.listAll(2, 25);

      expect(service.listAll).toHaveBeenCalledWith(2, 25);
      expect(result).toEqual(mockResponse);
    });
  });
});
