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
}

export interface ApplicationsListResponse {
  data: ApplicationListItemDto[];
  total: number;
  page: number;
  totalPages: number;
}
