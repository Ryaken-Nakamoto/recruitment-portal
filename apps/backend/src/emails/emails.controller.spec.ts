import { Test, TestingModule } from '@nestjs/testing';
import { EmailsController } from './emails.controller';
import { EmailsService } from './emails.service';
import { Email } from './entities/email.entity';

describe('EmailsController', () => {
  let controller: EmailsController;
  let service: jest.Mocked<EmailsService>;

  beforeEach(async () => {
    const mockService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      getAutoVariables: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailsController],
      providers: [{ provide: EmailsService, useValue: mockService }],
    }).compile();

    controller = module.get<EmailsController>(EmailsController);
    service = module.get(EmailsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /emails', () => {
    it('should call service.findAll()', async () => {
      const emails = [{ id: 1 }, { id: 2 }] as Email[];
      service.findAll.mockResolvedValue(emails);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(emails);
    });
  });

  describe('GET /emails/variables', () => {
    it('should call service.getAutoVariables()', () => {
      service.getAutoVariables.mockReturnValue(['firstName', 'lastName']);

      const result = controller.getAutoVariables();

      expect(service.getAutoVariables).toHaveBeenCalled();
      expect(result).toEqual(['firstName', 'lastName']);
    });
  });

  describe('PATCH /emails/:id', () => {
    it('should call service.update() with id and dto', async () => {
      const dto = { body: 'Updated body {{calendlyLink}}' };
      const updated = { id: 1, body: dto.body } as Email;
      service.update.mockResolvedValue(updated);

      const result = await controller.update(1, dto);

      expect(service.update).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(updated);
    });
  });
});
