import { ApplicationRound } from '../enums/application-round.enum';
import { RoundStatus } from '../enums/round-status.enum';
import { FinalDecision } from '../enums/final-decision.enum';
import { AcademicYear } from '../../applicants/enums/academic-year.enum';

export class ApplicantSummaryDto {
  id: number;
  name: string;
  email: string;
  major: string;
  academicYear: AcademicYear;
  graduationYear: number | null;
}

export class ApplicationListItemDto {
  id: number;
  round: ApplicationRound;
  roundStatus: RoundStatus;
  finalDecision: FinalDecision | null;
  submittedAt: Date;
  applicant: ApplicantSummaryDto;
}

export class ApplicationsListResponseDto {
  data: ApplicationListItemDto[];
  total: number;
  page: number;
  totalPages: number;
}
