import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Application } from '../applications/entities/application.entity';
import { Applicant } from '../applicants/entities/applicant.entity';
import { Email } from '../emails/entities/email.entity';
import { ApplicationRound } from '../applications/enums/application-round.enum';
import { RoundStatus } from '../applications/enums/round-status.enum';
import { FinalDecision } from '../applications/enums/final-decision.enum';
import { AdminDecision } from '../applications/enums/admin-decision.enum';
import { MakeDecisionDto } from './dto/make-decision.dto';

const ROUND_ORDER: ApplicationRound[] = [
  ApplicationRound.SCREENING,
  ApplicationRound.TECHNICAL_INTERVIEW,
  ApplicationRound.BEHAVIORAL_INTERVIEW,
];

@Injectable()
export class AdminDecisionsService {
  private readonly logger = new Logger(AdminDecisionsService.name);

  constructor(
    @InjectRepository(Application)
    private readonly applicationRepo: Repository<Application>,
    @InjectRepository(Email)
    private readonly emailRepo: Repository<Email>,
  ) {}

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

  async sendEmail(applicationId: number): Promise<void> {
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

    // Look up the email template for this round + decision
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

    // Render template with auto-variables + custom defaults
    const applicant = application.applicant as Applicant;
    const rendered = this.renderTemplate(template.subject, template.body, {
      ...template.defaultContext,
      firstName: applicant.firstName,
      lastName: applicant.lastName,
    });

    // TODO: integrate with SES/nodemailer for actual delivery
    this.logger.log(
      `Sending email to ${applicant.email} — subject: "${rendered.subject}"`,
    );

    // Transition state based on outcome
    if (application.finalDecision !== null) {
      // Rejected or accepted → terminal state
      application.roundStatus = RoundStatus.EMAIL_SENT;
      this.logger.log(
        `Application ${applicationId} transitioned to EMAIL_SENT (${application.finalDecision})`,
      );
    } else {
      // Advancing to next round
      application.round = this.getNextRound(application.round);
      application.roundStatus = RoundStatus.PENDING;
      this.logger.log(
        `Application ${applicationId} advanced to round ${application.round}`,
      );
    }

    await this.applicationRepo.save(application);
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
