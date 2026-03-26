import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { marked } from 'marked';

@Injectable()
export class NodemailerService {
  private readonly logger = new Logger(NodemailerService.name);
  private readonly transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  constructor() {
    marked.use({ breaks: true });
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
    if (process.env.NODE_ENV !== 'local') {
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
      await this.transporter.sendMail({
        from: params.from,
        to: recipientEmail,
        subject: params.subject,
        text: params.body,
        html: htmlBody,
      });
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
