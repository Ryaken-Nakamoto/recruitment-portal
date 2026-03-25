import { Injectable, Logger } from '@nestjs/common';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { marked, Renderer } from 'marked';

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

  constructor() {
    // Custom renderer for email-safe HTML: add inline styles to list elements
    // Email clients strip or ignore CSS from <head>, so inline styles are required
    const renderer = new Renderer();

    renderer.list = ({ items, ordered }) => {
      const tag = ordered ? 'ol' : 'ul';
      const listStyle = 'style="padding-left: 2em; margin: 1em 0;"';
      const inner = items
        .map((item) => `<li style="margin: 0.25em 0;">${item.text}</li>`)
        .join('');
      return `<${tag} ${listStyle}>${inner}</${tag}>\n`;
    };

    marked.use({ breaks: true, renderer });
  }

  /**
   * Converts markdown to HTML for email bodies.
   * Supports standard markdown syntax: **bold**, _italic_, links, lists, etc.
   */
  private markdownToHtml(markdown: string): string {
    return marked.parse(markdown) as string;
  }

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
      const htmlBody = this.markdownToHtml(params.body);
      await this.client.send(
        new SendEmailCommand({
          FromEmailAddress: params.from,
          Destination: { ToAddresses: [recipientEmail] },
          Content: {
            Simple: {
              Subject: { Data: params.subject },
              Body: {
                Text: { Data: params.body },
                Html: { Data: htmlBody },
              },
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
