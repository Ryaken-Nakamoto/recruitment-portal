import { ApplicationRound, RoundStatus } from './enums';

export interface ApplicationSummaryDto {
  id: number;
  round: ApplicationRound;
  roundStatus: RoundStatus;
  applicant: { firstName: string; lastName: string };
}
