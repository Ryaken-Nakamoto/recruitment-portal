import { ApplicationRound, FinalDecision } from './enums';

export interface EmailPreviewDto {
  templateId: number;
  toEmail: string;
  fromEmail: string;
  subject: string;
  body: string;
}

export interface SentEmailListItemDto {
  id: number;
  applicationId: number;
  toEmail: string;
  fromEmail: string;
  subject: string;
  applicationStage: ApplicationRound;
  finalDecision: FinalDecision | null;
  sentAt: string;
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
  sentAt: string;
}

export interface SentEmailsListResponse {
  data: SentEmailListItemDto[];
  total: number;
  page: number;
  totalPages: number;
}
