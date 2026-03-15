import { Injectable, Logger } from '@nestjs/common';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

@Injectable()
export class SesService {
  private readonly logger = new Logger(SesService.name);
  private readonly client = new SESv2Client({
    region: process.env.REGION ?? 'us-east-1',
  });

  async sendEmail(params: {
    to: string;
    from: string;
    subject: string;
    body: string;
  }): Promise<void> {
    if (process.env.NODE_ENV === 'local') {
      this.logger.log(
        `[LOCAL MODE] Email would be sent to ${params.to} — subject: "${params.subject}"`,
      );
      return;
    }

    try {
      await this.client.send(
        new SendEmailCommand({
          FromEmailAddress: params.from,
          Destination: { ToAddresses: [params.to] },
          Content: {
            Simple: {
              Subject: { Data: params.subject },
              Body: { Text: { Data: params.body } },
            },
          },
        }),
      );
      this.logger.log(
        `Email sent to ${params.to} — subject: "${params.subject}"`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${params.to}: ${(error as Error).message}`,
      );
      throw error;
    }
  }
}
