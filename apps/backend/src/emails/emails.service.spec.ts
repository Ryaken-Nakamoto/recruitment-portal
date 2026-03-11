import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';

import { EmailsService } from './emails.service';
import { Email } from './entities/email.entity';
import { AUTO_VARIABLES } from './constants/auto-variables';

describe('EmailsService', () => {
  let service: EmailsService;
  let emailRepo: jest.Mocked<Repository<Email>>;

  beforeEach(async () => {
    const mockRepo = {
      find: jest.fn(),
      findOneBy: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailsService,
        { provide: getRepositoryToken(Email), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<EmailsService>(EmailsService);
    emailRepo = module.get(getRepositoryToken(Email));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all email templates', async () => {
      const emails = [{ id: 1 }, { id: 2 }] as Email[];
      emailRepo.find.mockResolvedValue(emails);

      const result = await service.findAll();

      expect(emailRepo.find).toHaveBeenCalled();
      expect(result).toEqual(emails);
    });
  });

  describe('findOne', () => {
    it('should return the email when found', async () => {
      const email = { id: 1, subject: 'Test' } as Email;
      emailRepo.findOneBy.mockResolvedValue(email);

      const result = await service.findOne(1);

      expect(emailRepo.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(result).toEqual(email);
    });

    it('should throw NotFoundException when email not found', async () => {
      emailRepo.findOneBy.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update subject only when body not provided', async () => {
      const email = {
        id: 1,
        subject: 'Old Subject',
        body: 'Hello {{firstName}}',
        requiredVariables: [],
      } as Email;
      emailRepo.findOneBy.mockResolvedValue(email);
      emailRepo.save.mockResolvedValue({ ...email, subject: 'New Subject' });

      const result = await service.update(1, { subject: 'New Subject' });

      expect(result.subject).toBe('New Subject');
      // requiredVariables should not be re-parsed when body is unchanged
      expect(emailRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ subject: 'New Subject' }),
      );
    });

    it('should re-parse requiredVariables when body changes', async () => {
      const email = {
        id: 1,
        subject: 'Test',
        body: 'Old body',
        requiredVariables: [],
      } as Email;
      emailRepo.findOneBy.mockResolvedValue(email);
      emailRepo.save.mockImplementation(async (e) => e as Email);

      const result = await service.update(1, {
        body: 'Hello {{firstName}} sign up at {{calendlyLink}}',
      });

      expect(result.requiredVariables).toEqual(['calendlyLink']);
    });

    it('should filter out AUTO_VARIABLES from requiredVariables', async () => {
      const email = {
        id: 1,
        subject: 'Test',
        body: '',
        requiredVariables: [],
      } as Email;
      emailRepo.findOneBy.mockResolvedValue(email);
      emailRepo.save.mockImplementation(async (e) => e as Email);

      const result = await service.update(1, {
        body: 'Hello {{firstName}} {{lastName}}',
      });

      expect(result.requiredVariables).toEqual([]);
    });

    it('should deduplicate variables in requiredVariables', async () => {
      const email = {
        id: 1,
        subject: 'Test',
        body: '',
        requiredVariables: [],
      } as Email;
      emailRepo.findOneBy.mockResolvedValue(email);
      emailRepo.save.mockImplementation(async (e) => e as Email);

      const result = await service.update(1, {
        body: '{{link}} and again {{link}} also {{otherVar}}',
      });

      expect(result.requiredVariables).toEqual(['link', 'otherVar']);
    });

    it('should handle multiple unique vars and filter auto-variables', async () => {
      const email = {
        id: 1,
        subject: 'Test',
        body: '',
        requiredVariables: [],
      } as Email;
      emailRepo.findOneBy.mockResolvedValue(email);
      emailRepo.save.mockImplementation(async (e) => e as Email);

      const result = await service.update(1, {
        body: '{{firstName}} {{lastName}} {{calendlyLink}} {{position}}',
      });

      expect(result.requiredVariables).toEqual(['calendlyLink', 'position']);
    });
  });

  describe('getAutoVariables', () => {
    it('should return AUTO_VARIABLES', () => {
      const result = service.getAutoVariables();
      expect(result).toEqual([...AUTO_VARIABLES]);
    });
  });
});
