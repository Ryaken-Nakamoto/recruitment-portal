import { Injectable, Logger } from '@nestjs/common';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

@Injectable()
export class SesService {
  private readonly logger = new Logger(SesService.name);
  private readonly client = new SESv2Client({
    region: process.env.C4C_REGION ?? 'us-east-2',
    credentials: {
      accessKeyId: process.env.C4C_AWS_ACCESS_KEY ?? '',
      secretAccessKey: process.env.C4C_AWS_SECRET_ACCESS_KEY ?? '',
    },
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

    // Redirect to mock email destination if MOCK_EMAIL is enabled
    let recipientEmail = params.to;
    if (process.env.MOCK_EMAIL === 'true' && process.env.MOCK_EMAIL_DEST) {
      this.logger.log(
        `[MOCK MODE] Redirecting email from ${params.to} to ${process.env.MOCK_EMAIL_DEST}`,
      );
      recipientEmail = process.env.MOCK_EMAIL_DEST;
    }

    try {
      await this.client.send(
        new SendEmailCommand({
          FromEmailAddress: params.from,
          Destination: { ToAddresses: [recipientEmail] },
          Content: {
            Simple: {
              Subject: { Data: params.subject },
              Body: { Text: { Data: params.body } },
            },
          },
        }),
      );
      this.logger.log(
        `Email sent to ${recipientEmail} — subject: "${params.subject}"`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${recipientEmail}: ${
          (error as Error).message
        }`,
      );
      throw error;
    }
  }
}
