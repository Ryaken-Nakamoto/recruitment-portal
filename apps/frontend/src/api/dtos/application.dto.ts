import {
  ApplicationRound,
  RoundStatus,
  FinalDecision,
  AcademicYear,
} from './enums';

export interface ApplicationSummaryDto {
  id: number;
  round: ApplicationRound;
  roundStatus: RoundStatus;
  applicant: { name: string };
}

export interface ApplicationListItemApplicantDto {
  id: number;
  name: string;
  email: string;
  major: string;
  academicYear: AcademicYear;
  graduationYear: number | null;
}

export interface ApplicationListItemDto {
  id: number;
  round: ApplicationRound;
  roundStatus: RoundStatus;
  finalDecision: FinalDecision | null;
  submittedAt: string;
  applicant: ApplicationListItemApplicantDto;
  reviewsSubmitted: number;
  reviewsTotal: number;
  averageScore: number | null;
}

export interface ApplicationsListResponse {
  data: ApplicationListItemDto[];
  total: number;
  page: number;
  totalPages: number;
}

export type AdminDecision = 'advance' | 'reject' | 'accept';

export interface BulkDecideRequest {
  applicationIds: number[];
  decision: AdminDecision;
}

export interface BulkDecideFailure {
  id: number;
  applicantName: string;
  reason: string;
}

export interface BulkDecideResponse {
  succeeded: number[];
  failed: BulkDecideFailure[];
}

export interface BulkSendEmailRequest {
  applicationIds: number[];
}

export interface BulkSendEmailResponse {
  succeeded: number[];
  failed: BulkDecideFailure[];
}

export interface BulkRevertRequest {
  applicationIds: number[];
}

export interface BulkRevertResponse {
  succeeded: number[];
  failed: BulkDecideFailure[];
}
