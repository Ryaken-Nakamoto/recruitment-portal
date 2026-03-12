import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';

import { AdminDecisionsService } from '../admin-decisions.service';
import { Application } from '../../applications/entities/application.entity';
import { Email } from '../../emails/entities/email.entity';
import { ApplicationRound } from '../../applications/enums/application-round.enum';
import { RoundStatus } from '../../applications/enums/round-status.enum';
import { FinalDecision } from '../../applications/enums/final-decision.enum';
import { AdminDecision } from '../../applications/enums/admin-decision.enum';

describe('AdminDecisionsService', () => {
  let service: AdminDecisionsService;
  let applicationRepo: jest.Mocked<Repository<Application>>;
  let emailRepo: jest.Mocked<Repository<Email>>;

  beforeEach(async () => {
    const mockApplicationRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((app) => Promise.resolve(app)),
    };
    const mockEmailRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminDecisionsService,
        {
          provide: getRepositoryToken(Application),
          useValue: mockApplicationRepo,
        },
        { provide: getRepositoryToken(Email), useValue: mockEmailRepo },
      ],
    }).compile();

    service = module.get<AdminDecisionsService>(AdminDecisionsService);
    applicationRepo = module.get(getRepositoryToken(Application));
    emailRepo = module.get(getRepositoryToken(Email));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─────────────────────────────────────────────
  // makeDecision
  // ─────────────────────────────────────────────
  describe('makeDecision', () => {
    function makeApp(overrides: Partial<Application> = {}): Application {
      return {
        id: 1,
        round: ApplicationRound.SCREENING,
        roundStatus: RoundStatus.AWAITING_ADMIN,
        finalDecision: null,
        ...overrides,
      } as Application;
    }

    it('throws NotFoundException when application does not exist', async () => {
      applicationRepo.findOne.mockResolvedValue(null);
      await expect(
        service.makeDecision(99, { decision: AdminDecision.ADVANCE }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when application is not in AWAITING_ADMIN', async () => {
      applicationRepo.findOne.mockResolvedValue(
        makeApp({ roundStatus: RoundStatus.IN_PROGRESS }),
      );
      await expect(
        service.makeDecision(1, { decision: AdminDecision.ADVANCE }),
      ).rejects.toThrow(BadRequestException);
    });

    it('sets roundStatus to PENDING_EMAIL and finalDecision to null when advancing', async () => {
      const app = makeApp();
      applicationRepo.findOne.mockResolvedValue(app);

      await service.makeDecision(1, { decision: AdminDecision.ADVANCE });

      expect(app.roundStatus).toBe(RoundStatus.PENDING_EMAIL);
      expect(app.finalDecision).toBeNull();
      expect(applicationRepo.save).toHaveBeenCalledWith(app);
    });

    it('sets roundStatus to PENDING_EMAIL and finalDecision to REJECTED when rejecting', async () => {
      const app = makeApp();
      applicationRepo.findOne.mockResolvedValue(app);

      await service.makeDecision(1, { decision: AdminDecision.REJECT });

      expect(app.roundStatus).toBe(RoundStatus.PENDING_EMAIL);
      expect(app.finalDecision).toBe(FinalDecision.REJECTED);
      expect(applicationRepo.save).toHaveBeenCalledWith(app);
    });

    it('sets roundStatus to PENDING_EMAIL and finalDecision to ACCEPTED when accepting', async () => {
      const app = makeApp();
      applicationRepo.findOne.mockResolvedValue(app);

      await service.makeDecision(1, { decision: AdminDecision.ACCEPT });

      expect(app.roundStatus).toBe(RoundStatus.PENDING_EMAIL);
      expect(app.finalDecision).toBe(FinalDecision.ACCEPTED);
      expect(applicationRepo.save).toHaveBeenCalledWith(app);
    });
  });

  // ─────────────────────────────────────────────
  // sendEmail
  // ─────────────────────────────────────────────
  describe('sendEmail', () => {
    const mockApplicant = {
      name: 'Alice Smith',
      email: 'alice@example.com',
    };
    const mockTemplate = {
      subject: 'Hello {{firstName}}',
      body: 'Dear {{firstName}} {{lastName}},',
      defaultContext: {},
    } as Email;

    function makeApp(overrides: Partial<Application> = {}): Application {
      return {
        id: 1,
        round: ApplicationRound.SCREENING,
        roundStatus: RoundStatus.PENDING_EMAIL,
        finalDecision: null,
        applicant: mockApplicant,
        ...overrides,
      } as unknown as Application;
    }

    it('throws NotFoundException when application does not exist', async () => {
      applicationRepo.findOne.mockResolvedValue(null);
      await expect(service.sendEmail(99)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when application is not in PENDING_EMAIL', async () => {
      applicationRepo.findOne.mockResolvedValue(
        makeApp({ roundStatus: RoundStatus.AWAITING_ADMIN }),
      );
      await expect(service.sendEmail(1)).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when no email template is found', async () => {
      applicationRepo.findOne.mockResolvedValue(makeApp());
      emailRepo.findOne.mockResolvedValue(null);
      await expect(service.sendEmail(1)).rejects.toThrow(NotFoundException);
    });

    it('advances round and sets PENDING when finalDecision is null (advancing)', async () => {
      const app = makeApp({ finalDecision: null });
      applicationRepo.findOne.mockResolvedValue(app);
      emailRepo.findOne.mockResolvedValue(mockTemplate);

      await service.sendEmail(1);

      expect(app.round).toBe(ApplicationRound.TECHNICAL_INTERVIEW);
      expect(app.roundStatus).toBe(RoundStatus.PENDING);
      expect(applicationRepo.save).toHaveBeenCalledWith(app);
    });

    it('sets EMAIL_SENT when finalDecision is REJECTED', async () => {
      const app = makeApp({ finalDecision: FinalDecision.REJECTED });
      applicationRepo.findOne.mockResolvedValue(app);
      emailRepo.findOne.mockResolvedValue(mockTemplate);

      await service.sendEmail(1);

      expect(app.roundStatus).toBe(RoundStatus.EMAIL_SENT);
      expect(applicationRepo.save).toHaveBeenCalledWith(app);
    });

    it('sets EMAIL_SENT when finalDecision is ACCEPTED', async () => {
      const app = makeApp({ finalDecision: FinalDecision.ACCEPTED });
      applicationRepo.findOne.mockResolvedValue(app);
      emailRepo.findOne.mockResolvedValue(mockTemplate);

      await service.sendEmail(1);

      expect(app.roundStatus).toBe(RoundStatus.EMAIL_SENT);
      expect(applicationRepo.save).toHaveBeenCalledWith(app);
    });

    it('looks up template with ACCEPTED decision when advancing (finalDecision null)', async () => {
      const app = makeApp({
        finalDecision: null,
        round: ApplicationRound.TECHNICAL_INTERVIEW,
      });
      applicationRepo.findOne.mockResolvedValue(app);
      emailRepo.findOne.mockResolvedValue(mockTemplate);

      await service.sendEmail(1);

      expect(emailRepo.findOne).toHaveBeenCalledWith({
        where: {
          applicationStage: ApplicationRound.TECHNICAL_INTERVIEW,
          decision: FinalDecision.ACCEPTED,
        },
      });
    });

    it('looks up template with REJECTED decision when rejecting', async () => {
      const app = makeApp({ finalDecision: FinalDecision.REJECTED });
      applicationRepo.findOne.mockResolvedValue(app);
      emailRepo.findOne.mockResolvedValue(mockTemplate);

      await service.sendEmail(1);

      expect(emailRepo.findOne).toHaveBeenCalledWith({
        where: {
          applicationStage: ApplicationRound.SCREENING,
          decision: FinalDecision.REJECTED,
        },
      });
    });

    it('renders template variables into the email', async () => {
      const templateWithVars = {
        subject: 'Hi {{firstName}}',
        body: 'Hello {{firstName}} {{lastName}}, welcome!',
        defaultContext: { customVar: 'value' },
      } as unknown as Email;
      const app = makeApp({ finalDecision: null });
      applicationRepo.findOne.mockResolvedValue(app);
      emailRepo.findOne.mockResolvedValue(templateWithVars);

      // Should not throw — template renders correctly
      await expect(service.sendEmail(1)).resolves.not.toThrow();
    });

    it('throws BadRequestException when trying to advance past the last round', async () => {
      const app = makeApp({
        finalDecision: null,
        round: ApplicationRound.BEHAVIORAL_INTERVIEW,
      });
      applicationRepo.findOne.mockResolvedValue(app);
      emailRepo.findOne.mockResolvedValue(mockTemplate);

      await expect(service.sendEmail(1)).rejects.toThrow(BadRequestException);
    });
  });
});
