import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';

import { AdminDecisionsService } from '../admin-decisions.service';
import { Application } from '../../applications/entities/application.entity';
import { Email } from '../../emails/entities/email.entity';
import { SentEmail } from '../../emails/entities/sent-email.entity';
import { SesService } from '../../util/ses/ses.service';
import { ApplicationRound } from '../../applications/enums/application-round.enum';
import { RoundStatus } from '../../applications/enums/round-status.enum';
import { FinalDecision } from '../../applications/enums/final-decision.enum';
import { AdminDecision } from '../../applications/enums/admin-decision.enum';

describe('AdminDecisionsService', () => {
  let service: AdminDecisionsService;
  let applicationRepo: jest.Mocked<Repository<Application>>;
  let emailRepo: jest.Mocked<Repository<Email>>;
  let sentEmailRepo: jest.Mocked<Repository<SentEmail>>;
  let sesService: jest.Mocked<SesService>;

  beforeEach(async () => {
    const mockApplicationRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn().mockImplementation((app) => Promise.resolve(app)),
    };
    const mockEmailRepo = {
      findOne: jest.fn(),
    };
    const mockSentEmailRepo = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
    };
    const mockSesService = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminDecisionsService,
        {
          provide: getRepositoryToken(Application),
          useValue: mockApplicationRepo,
        },
        { provide: getRepositoryToken(Email), useValue: mockEmailRepo },
        { provide: getRepositoryToken(SentEmail), useValue: mockSentEmailRepo },
        { provide: SesService, useValue: mockSesService },
      ],
    }).compile();

    service = module.get<AdminDecisionsService>(AdminDecisionsService);
    applicationRepo = module.get(getRepositoryToken(Application));
    emailRepo = module.get(getRepositoryToken(Email));
    sentEmailRepo = module.get(getRepositoryToken(SentEmail));
    sesService = module.get(SesService);
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
  // getEmailPreview
  // ─────────────────────────────────────────────
  describe('getEmailPreview', () => {
    const mockApplicant = {
      name: 'Alice Smith',
      email: 'alice@example.com',
    };
    const mockTemplate = {
      id: 5,
      subject: 'Hello {{firstName}}',
      body: 'Dear {{firstName}}, welcome!',
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
      await expect(service.getEmailPreview(99)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when application is not in PENDING_EMAIL', async () => {
      applicationRepo.findOne.mockResolvedValue(
        makeApp({ roundStatus: RoundStatus.AWAITING_ADMIN }),
      );
      await expect(service.getEmailPreview(1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws NotFoundException when no email template is found', async () => {
      applicationRepo.findOne.mockResolvedValue(makeApp());
      emailRepo.findOne.mockResolvedValue(null);
      await expect(service.getEmailPreview(1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns rendered preview with firstName substituted', async () => {
      applicationRepo.findOne.mockResolvedValue(makeApp());
      emailRepo.findOne.mockResolvedValue(mockTemplate);

      const result = await service.getEmailPreview(1);

      expect(result.templateId).toBe(5);
      expect(result.toEmail).toBe('alice@example.com');
      expect(result.subject).toBe('Hello Alice');
      expect(result.body).toBe('Dear Alice, welcome!');
    });

    it('uses ACCEPTED decision when finalDecision is null (advancing)', async () => {
      applicationRepo.findOne.mockResolvedValue(
        makeApp({ finalDecision: null }),
      );
      emailRepo.findOne.mockResolvedValue(mockTemplate);

      await service.getEmailPreview(1);

      expect(emailRepo.findOne).toHaveBeenCalledWith({
        where: {
          applicationStage: ApplicationRound.SCREENING,
          decision: FinalDecision.ACCEPTED,
        },
      });
    });

    it('uses REJECTED decision when finalDecision is REJECTED', async () => {
      applicationRepo.findOne.mockResolvedValue(
        makeApp({ finalDecision: FinalDecision.REJECTED }),
      );
      emailRepo.findOne.mockResolvedValue(mockTemplate);

      await service.getEmailPreview(1);

      expect(emailRepo.findOne).toHaveBeenCalledWith({
        where: {
          applicationStage: ApplicationRound.SCREENING,
          decision: FinalDecision.REJECTED,
        },
      });
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
    const sendDto = { subject: 'Hi Alice', body: 'Dear Alice, welcome!' };

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
      await expect(service.sendEmail(99, sendDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when application is not in PENDING_EMAIL', async () => {
      applicationRepo.findOne.mockResolvedValue(
        makeApp({ roundStatus: RoundStatus.AWAITING_ADMIN }),
      );
      await expect(service.sendEmail(1, sendDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('calls SesService.sendEmail with correct params', async () => {
      const app = makeApp({ finalDecision: null });
      applicationRepo.findOne.mockResolvedValue(app);

      await service.sendEmail(1, sendDto);

      expect(sesService.sendEmail).toHaveBeenCalledWith({
        to: 'alice@example.com',
        from: expect.any(String),
        subject: sendDto.subject,
        body: sendDto.body,
      });
    });

    it('saves a SentEmail record', async () => {
      const app = makeApp({ finalDecision: null });
      applicationRepo.findOne.mockResolvedValue(app);

      await service.sendEmail(1, sendDto);

      expect(sentEmailRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          applicationId: 1,
          toEmail: 'alice@example.com',
          subject: sendDto.subject,
          body: sendDto.body,
          applicationStage: ApplicationRound.SCREENING,
          finalDecision: null,
        }),
      );
      expect(sentEmailRepo.save).toHaveBeenCalled();
    });

    it('advances round and sets PENDING when finalDecision is null (advancing)', async () => {
      const app = makeApp({ finalDecision: null });
      applicationRepo.findOne.mockResolvedValue(app);

      await service.sendEmail(1, sendDto);

      expect(app.round).toBe(ApplicationRound.TECHNICAL_INTERVIEW);
      expect(app.roundStatus).toBe(RoundStatus.PENDING);
      expect(applicationRepo.save).toHaveBeenCalledWith(app);
    });

    it('sets EMAIL_SENT when finalDecision is REJECTED', async () => {
      const app = makeApp({ finalDecision: FinalDecision.REJECTED });
      applicationRepo.findOne.mockResolvedValue(app);

      await service.sendEmail(1, sendDto);

      expect(app.roundStatus).toBe(RoundStatus.EMAIL_SENT);
      expect(applicationRepo.save).toHaveBeenCalledWith(app);
    });

    it('sets EMAIL_SENT when finalDecision is ACCEPTED', async () => {
      const app = makeApp({ finalDecision: FinalDecision.ACCEPTED });
      applicationRepo.findOne.mockResolvedValue(app);

      await service.sendEmail(1, sendDto);

      expect(app.roundStatus).toBe(RoundStatus.EMAIL_SENT);
      expect(applicationRepo.save).toHaveBeenCalledWith(app);
    });

    it('throws BadRequestException when trying to advance past the last round', async () => {
      const app = makeApp({
        finalDecision: null,
        round: ApplicationRound.BEHAVIORAL_INTERVIEW,
      });
      applicationRepo.findOne.mockResolvedValue(app);

      await expect(service.sendEmail(1, sendDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─────────────────────────────────────────────
  // getSentEmails
  // ─────────────────────────────────────────────
  describe('getSentEmails', () => {
    it('returns paginated list of sent emails', async () => {
      const mockEmail = {
        id: 1,
        applicationId: 2,
        toEmail: 'alice@example.com',
        fromEmail: 'team@c4c.com',
        subject: 'Hello',
        applicationStage: ApplicationRound.SCREENING,
        finalDecision: null,
        sentAt: new Date(),
      } as SentEmail;

      sentEmailRepo.findAndCount.mockResolvedValue([[mockEmail], 1]);

      const result = await service.getSentEmails(1, 20);

      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].toEmail).toBe('alice@example.com');
    });
  });

  // ─────────────────────────────────────────────
  // getSentEmail
  // ─────────────────────────────────────────────
  describe('getSentEmail', () => {
    it('throws NotFoundException when sent email does not exist', async () => {
      sentEmailRepo.findOne.mockResolvedValue(null);
      await expect(service.getSentEmail(99)).rejects.toThrow(NotFoundException);
    });

    it('returns sent email detail', async () => {
      const mockEmail = {
        id: 1,
        applicationId: 2,
        toEmail: 'alice@example.com',
        fromEmail: 'team@c4c.com',
        subject: 'Hello',
        body: 'Dear Alice',
        applicationStage: ApplicationRound.SCREENING,
        finalDecision: null,
        sentAt: new Date(),
      } as SentEmail;

      sentEmailRepo.findOne.mockResolvedValue(mockEmail);

      const result = await service.getSentEmail(1);

      expect(result.id).toBe(1);
      expect(result.body).toBe('Dear Alice');
    });
  });

  // ─────────────────────────────────────────────
  // bulkDecide
  // ─────────────────────────────────────────────
  describe('bulkDecide', () => {
    function makeApp(overrides: Partial<Application> = {}): Application {
      return {
        id: 1,
        round: ApplicationRound.SCREENING,
        roundStatus: RoundStatus.AWAITING_ADMIN,
        finalDecision: null,
        applicant: { id: 1, name: 'Alice Smith' },
        ...overrides,
      } as unknown as Application;
    }

    it('returns empty result when applicationIds is empty', async () => {
      const result = await service.bulkDecide({
        applicationIds: [],
        decision: AdminDecision.ADVANCE,
      });

      expect(result).toEqual({ succeeded: [], failed: [] });
      expect(applicationRepo.find).not.toHaveBeenCalled();
    });

    it('advances all apps when all are in AWAITING_ADMIN', async () => {
      const app1 = makeApp({
        id: 1,
        applicant: { id: 1, name: 'Alice' } as never,
      });
      const app2 = makeApp({
        id: 2,
        applicant: { id: 2, name: 'Bob' } as never,
      });
      applicationRepo.find.mockResolvedValue([app1, app2]);

      const result = await service.bulkDecide({
        applicationIds: [1, 2],
        decision: AdminDecision.ADVANCE,
      });

      expect(result.succeeded).toEqual([1, 2]);
      expect(result.failed).toEqual([]);
      expect(app1.finalDecision).toBeNull();
      expect(app1.roundStatus).toBe(RoundStatus.PENDING_EMAIL);
      expect(app2.finalDecision).toBeNull();
      expect(app2.roundStatus).toBe(RoundStatus.PENDING_EMAIL);
      expect(applicationRepo.save).toHaveBeenCalledWith([app1, app2]);
    });

    it('rejects all apps when decision is REJECT', async () => {
      const app1 = makeApp({
        id: 1,
        applicant: { id: 1, name: 'Alice' } as never,
      });
      applicationRepo.find.mockResolvedValue([app1]);

      const result = await service.bulkDecide({
        applicationIds: [1],
        decision: AdminDecision.REJECT,
      });

      expect(result.succeeded).toEqual([1]);
      expect(result.failed).toEqual([]);
      expect(app1.finalDecision).toBe(FinalDecision.REJECTED);
      expect(app1.roundStatus).toBe(RoundStatus.PENDING_EMAIL);
    });

    it('accepts all apps when decision is ACCEPT', async () => {
      const app1 = makeApp({
        id: 1,
        applicant: { id: 1, name: 'Alice' } as never,
      });
      applicationRepo.find.mockResolvedValue([app1]);

      const result = await service.bulkDecide({
        applicationIds: [1],
        decision: AdminDecision.ACCEPT,
      });

      expect(result.succeeded).toEqual([1]);
      expect(app1.finalDecision).toBe(FinalDecision.ACCEPTED);
    });

    it('fails apps not in AWAITING_ADMIN with descriptive reason', async () => {
      const app1 = makeApp({
        id: 1,
        roundStatus: RoundStatus.IN_PROGRESS,
        applicant: { id: 1, name: 'Alice' } as never,
      });
      applicationRepo.find.mockResolvedValue([app1]);

      const result = await service.bulkDecide({
        applicationIds: [1],
        decision: AdminDecision.ADVANCE,
      });

      expect(result.succeeded).toEqual([]);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].id).toBe(1);
      expect(result.failed[0].applicantName).toBe('Alice');
      expect(result.failed[0].reason).toContain('in_progress');
      expect(applicationRepo.save).not.toHaveBeenCalled();
    });

    it('returns partial success with mixed AWAITING_ADMIN and non-AWAITING_ADMIN apps', async () => {
      const app1 = makeApp({
        id: 1,
        roundStatus: RoundStatus.AWAITING_ADMIN,
        applicant: { id: 1, name: 'Alice' } as never,
      });
      const app2 = makeApp({
        id: 2,
        roundStatus: RoundStatus.PENDING_EMAIL,
        applicant: { id: 2, name: 'Bob' } as never,
      });
      applicationRepo.find.mockResolvedValue([app1, app2]);

      const result = await service.bulkDecide({
        applicationIds: [1, 2],
        decision: AdminDecision.ADVANCE,
      });

      expect(result.succeeded).toEqual([1]);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].id).toBe(2);
      expect(result.failed[0].applicantName).toBe('Bob');
      expect(applicationRepo.save).toHaveBeenCalledWith([app1]);
    });

    it('returns all failed when all apps are already decided', async () => {
      const app1 = makeApp({
        id: 1,
        roundStatus: RoundStatus.EMAIL_SENT,
        applicant: { id: 1, name: 'Alice' } as never,
      });
      const app2 = makeApp({
        id: 2,
        roundStatus: RoundStatus.PENDING_EMAIL,
        applicant: { id: 2, name: 'Bob' } as never,
      });
      applicationRepo.find.mockResolvedValue([app1, app2]);

      const result = await service.bulkDecide({
        applicationIds: [1, 2],
        decision: AdminDecision.REJECT,
      });

      expect(result.succeeded).toEqual([]);
      expect(result.failed).toHaveLength(2);
      expect(applicationRepo.save).not.toHaveBeenCalled();
    });
  });
});
