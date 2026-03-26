import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { Application } from '../applications/entities/application.entity';
import { Applicant } from '../applicants/entities/applicant.entity';
import { Email } from '../emails/entities/email.entity';
import { SentEmail } from '../emails/entities/sent-email.entity';
import { ApplicationRound } from '../applications/enums/application-round.enum';
import { RoundStatus } from '../applications/enums/round-status.enum';
import { FinalDecision } from '../applications/enums/final-decision.enum';
import { AdminDecision } from '../applications/enums/admin-decision.enum';
import { MakeDecisionDto } from './dto/make-decision.dto';
import { BulkDecideDto } from './dto/bulk-decide.dto';
import { EmailPreviewDto } from './dto/email-preview.dto';
import { SendEmailDto } from './dto/send-email.dto';
import { BulkSendEmailDto } from './dto/bulk-send-email.dto';
import { BulkRevertDto } from './dto/bulk-revert.dto';
import { NodemailerService } from '../util/nodemailer/nodemailer.service';

const ROUND_ORDER: ApplicationRound[] = [
  ApplicationRound.SCREENING,
  ApplicationRound.TECHNICAL_INTERVIEW,
  ApplicationRound.BEHAVIORAL_INTERVIEW,
];

export interface SentEmailListItemDto {
  id: number;
  applicationId: number;
  toEmail: string;
  fromEmail: string;
  subject: string;
  applicationStage: ApplicationRound;
  finalDecision: FinalDecision | null;
  sentAt: Date;
}

export interface SentEmailDetailDto {
  id: number;
  applicationId: number;
  toEmail: string;
  fromEmail: string;
  subject: string;
  body: string;
  applicationStage: ApplicationRound;
  finalDecision: FinalDecision | null;
  sentAt: Date;
}

export interface SentEmailsListResponse {
  data: SentEmailListItemDto[];
  total: number;
  page: number;
  totalPages: number;
}

@Injectable()
export class AdminDecisionsService {
  private readonly logger = new Logger(AdminDecisionsService.name);

  constructor(
    @InjectRepository(Application)
    private readonly applicationRepo: Repository<Application>,
    @InjectRepository(Email)
    private readonly emailRepo: Repository<Email>,
    @InjectRepository(SentEmail)
    private readonly sentEmailRepo: Repository<SentEmail>,
    private readonly sesService: NodemailerService,
  ) {}

  async bulkDecide(dto: BulkDecideDto): Promise<{
    succeeded: number[];
    failed: Array<{ id: number; applicantName: string; reason: string }>;
  }> {
    if (dto.applicationIds.length === 0) {
      return { succeeded: [], failed: [] };
    }

    const apps = await this.applicationRepo.find({
      where: { id: In(dto.applicationIds) },
      relations: ['applicant'],
    });

    const succeeded: number[] = [];
    const failed: Array<{ id: number; applicantName: string; reason: string }> =
      [];
    const successfulApps: Application[] = [];

    for (const app of apps) {
      const applicant = app.applicant as Applicant;
      if (app.roundStatus !== RoundStatus.AWAITING_ADMIN) {
        failed.push({
          id: app.id,
          applicantName: applicant.name,
          reason: `Application is not in Awaiting Admin state (current: ${app.roundStatus})`,
        });
        continue;
      }

      if (dto.decision === AdminDecision.ADVANCE) {
        app.finalDecision = null;
      } else if (dto.decision === AdminDecision.REJECT) {
        app.finalDecision = FinalDecision.REJECTED;
      } else {
        app.finalDecision = FinalDecision.ACCEPTED;
      }
      app.roundStatus = RoundStatus.PENDING_EMAIL;
      succeeded.push(app.id);
      successfulApps.push(app);
    }

    if (successfulApps.length > 0) {
      await this.applicationRepo.save(successfulApps);
    }

    this.logger.log(
      `Bulk decision: ${succeeded.length} succeeded, ${failed.length} failed`,
    );

    return { succeeded, failed };
  }

  async makeDecision(
    applicationId: number,
    dto: MakeDecisionDto,
  ): Promise<void> {
    const application = await this.applicationRepo.findOne({
      where: { id: applicationId },
    });
    if (!application) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }
    if (application.roundStatus !== RoundStatus.AWAITING_ADMIN) {
      throw new BadRequestException(
        `Application must be in AWAITING_ADMIN state (current: ${application.roundStatus})`,
      );
    }

    if (dto.decision === AdminDecision.ADVANCE) {
      application.finalDecision = null;
    } else if (dto.decision === AdminDecision.REJECT) {
      application.finalDecision = FinalDecision.REJECTED;
    } else {
      application.finalDecision = FinalDecision.ACCEPTED;
    }
    application.roundStatus = RoundStatus.PENDING_EMAIL;

    await this.applicationRepo.save(application);
    this.logger.log(
      `Admin decision for application ${applicationId}: ${dto.decision}`,
    );
  }

  async getEmailPreview(applicationId: number): Promise<EmailPreviewDto> {
    const application = await this.applicationRepo.findOne({
      where: { id: applicationId },
      relations: ['applicant'],
    });
    if (!application) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }
    if (application.roundStatus !== RoundStatus.PENDING_EMAIL) {
      throw new BadRequestException(
        `Application must be in PENDING_EMAIL state (current: ${application.roundStatus})`,
      );
    }

    const templateDecision =
      application.finalDecision ?? FinalDecision.ACCEPTED;
    const template = await this.emailRepo.findOne({
      where: {
        applicationStage: application.round,
        decision: templateDecision,
      },
    });
    if (!template) {
      throw new NotFoundException(
        `No email template found for round ${application.round} / decision ${templateDecision}`,
      );
    }

    const applicant = application.applicant as Applicant;
    const rendered = this.renderTemplate(template.subject, template.body, {
      firstName: applicant.name.split(' ')[0],
    });

    return {
      templateId: template.id,
      toEmail: applicant.email,
      fromEmail: process.env.C4C_SENDER_EMAIL ?? '',
      subject: rendered.subject,
      body: rendered.body,
    };
  }

  async sendEmail(applicationId: number, dto: SendEmailDto): Promise<void> {
    const application = await this.applicationRepo.findOne({
      where: { id: applicationId },
      relations: ['applicant'],
    });
    if (!application) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }
    if (application.roundStatus !== RoundStatus.PENDING_EMAIL) {
      throw new BadRequestException(
        `Application must be in PENDING_EMAIL state (current: ${application.roundStatus})`,
      );
    }

    const applicant = application.applicant as Applicant;
    const fromEmail = process.env.C4C_SENDER_EMAIL ?? '';

    await this.sesService.sendEmail({
      to: applicant.email,
      from: fromEmail,
      subject: dto.subject,
      body: dto.body,
    });

    const sentEmail = this.sentEmailRepo.create({
      applicationId: application.id,
      toEmail: applicant.email,
      fromEmail,
      subject: dto.subject,
      body: dto.body,
      applicationStage: application.round,
      finalDecision: application.finalDecision,
    });
    await this.sentEmailRepo.save(sentEmail);

    this.logger.log(
      `Email sent to ${applicant.email} — subject: "${dto.subject}"`,
    );

    // Transition state based on outcome
    if (application.finalDecision !== null) {
      application.roundStatus = RoundStatus.EMAIL_SENT;
      this.logger.log(
        `Application ${applicationId} transitioned to EMAIL_SENT (${application.finalDecision})`,
      );
    } else {
      application.round = this.getNextRound(application.round);
      application.roundStatus = RoundStatus.PENDING;
      this.logger.log(
        `Application ${applicationId} advanced to round ${application.round}`,
      );
    }

    await this.applicationRepo.save(application);
  }

  async bulkSendEmails(dto: BulkSendEmailDto): Promise<{
    succeeded: number[];
    failed: Array<{ id: number; applicantName: string; reason: string }>;
  }> {
    if (dto.applicationIds.length === 0) {
      return { succeeded: [], failed: [] };
    }

    const apps = await this.applicationRepo.find({
      where: { id: In(dto.applicationIds) },
      relations: ['applicant'],
    });

    const succeeded: number[] = [];
    const failed: Array<{ id: number; applicantName: string; reason: string }> =
      [];
    const successfulApps: Application[] = [];
    const fromEmail = process.env.C4C_SENDER_EMAIL ?? '';

    for (const app of apps) {
      const applicant = app.applicant as Applicant;
      if (app.roundStatus !== RoundStatus.PENDING_EMAIL) {
        failed.push({
          id: app.id,
          applicantName: applicant.name,
          reason: `Application is not in Pending Email state (current: ${app.roundStatus})`,
        });
        continue;
      }

      try {
        const templateDecision = app.finalDecision ?? FinalDecision.ACCEPTED;
        const template = await this.emailRepo.findOne({
          where: {
            applicationStage: app.round,
            decision: templateDecision,
          },
        });
        if (!template) {
          failed.push({
            id: app.id,
            applicantName: applicant.name,
            reason: `No email template found for round ${app.round} / decision ${templateDecision}`,
          });
          continue;
        }

        const rendered = this.renderTemplate(template.subject, template.body, {
          firstName: applicant.name.split(' ')[0],
        });

        await this.sesService.sendEmail({
          to: applicant.email,
          from: fromEmail,
          subject: rendered.subject,
          body: rendered.body,
        });

        const sentEmail = this.sentEmailRepo.create({
          applicationId: app.id,
          toEmail: applicant.email,
          fromEmail,
          subject: rendered.subject,
          body: rendered.body,
          applicationStage: app.round,
          finalDecision: app.finalDecision,
        });
        await this.sentEmailRepo.save(sentEmail);

        // Transition state based on outcome
        if (app.finalDecision !== null) {
          app.roundStatus = RoundStatus.EMAIL_SENT;
        } else {
          app.round = this.getNextRound(app.round);
          app.roundStatus = RoundStatus.PENDING;
        }

        succeeded.push(app.id);
        successfulApps.push(app);
      } catch (error) {
        failed.push({
          id: app.id,
          applicantName: applicant.name,
          reason: `Failed to send email: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        });
      }
    }

    if (successfulApps.length > 0) {
      await this.applicationRepo.save(successfulApps);
    }

    this.logger.log(
      `Bulk send emails: ${succeeded.length} succeeded, ${failed.length} failed`,
    );

    return { succeeded, failed };
  }

  async bulkRevertToPendingAdmin(dto: BulkRevertDto): Promise<{
    succeeded: number[];
    failed: Array<{ id: number; applicantName: string; reason: string }>;
  }> {
    if (dto.applicationIds.length === 0) {
      return { succeeded: [], failed: [] };
    }

    const apps = await this.applicationRepo.find({
      where: { id: In(dto.applicationIds) },
      relations: ['applicant'],
    });

    const succeeded: number[] = [];
    const failed: Array<{ id: number; applicantName: string; reason: string }> =
      [];
    const successfulApps: Application[] = [];

    for (const app of apps) {
      const applicant = app.applicant as Applicant;
      if (app.roundStatus !== RoundStatus.PENDING_EMAIL) {
        failed.push({
          id: app.id,
          applicantName: applicant.name,
          reason: `Application is not in Pending Email state (current: ${app.roundStatus})`,
        });
        continue;
      }

      app.roundStatus = RoundStatus.AWAITING_ADMIN;
      succeeded.push(app.id);
      successfulApps.push(app);
    }

    if (successfulApps.length > 0) {
      await this.applicationRepo.save(successfulApps);
    }

    this.logger.log(
      `Bulk revert to pending admin: ${succeeded.length} succeeded, ${failed.length} failed`,
    );

    return { succeeded, failed };
  }

  async getSentEmails(
    page: number,
    limit: number,
  ): Promise<SentEmailsListResponse> {
    const [emails, total] = await this.sentEmailRepo.findAndCount({
      order: { sentAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const data: SentEmailListItemDto[] = emails.map((e) => ({
      id: e.id,
      applicationId: e.applicationId,
      toEmail: e.toEmail,
      fromEmail: e.fromEmail,
      subject: e.subject,
      applicationStage: e.applicationStage,
      finalDecision: e.finalDecision,
      sentAt: e.sentAt,
    }));

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSentEmail(id: number): Promise<SentEmailDetailDto> {
    const email = await this.sentEmailRepo.findOne({ where: { id } });
    if (!email) {
      throw new NotFoundException(`Sent email ${id} not found`);
    }
    return {
      id: email.id,
      applicationId: email.applicationId,
      toEmail: email.toEmail,
      fromEmail: email.fromEmail,
      subject: email.subject,
      body: email.body,
      applicationStage: email.applicationStage,
      finalDecision: email.finalDecision,
      sentAt: email.sentAt,
    };
  }

  private getNextRound(current: ApplicationRound): ApplicationRound {
    const idx = ROUND_ORDER.indexOf(current);
    if (idx === -1 || idx === ROUND_ORDER.length - 1) {
      throw new BadRequestException(`No next round after ${current}`);
    }
    return ROUND_ORDER[idx + 1];
  }

  private renderTemplate(
    subject: string,
    body: string,
    context: Record<string, string>,
  ): { subject: string; body: string } {
    const replace = (text: string) =>
      text.replace(
        /\{\{(\w+)\}\}/g,
        (_, key: string) => context[key] ?? `{{${key}}}`,
      );
    return { subject: replace(subject), body: replace(body) };
  }
}
