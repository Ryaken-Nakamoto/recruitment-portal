import {
  ApplicationRound,
  RoundStatus,
  FinalDecision,
  AcademicYear,
} from '@api/dtos/enums';

export function formatRound(round: ApplicationRound): string {
  const roundMap: Record<ApplicationRound, string> = {
    [ApplicationRound.SCREENING]: 'Screening',
    [ApplicationRound.TECHNICAL_INTERVIEW]: 'Technical Interview',
    [ApplicationRound.BEHAVIORAL_INTERVIEW]: 'Behavioral Interview',
  };
  return roundMap[round];
}

export function formatRoundStatus(status: RoundStatus): string {
  const statusMap: Record<RoundStatus, string> = {
    [RoundStatus.PENDING]: 'Pending',
    [RoundStatus.IN_PROGRESS]: 'In Progress',
    [RoundStatus.AWAITING_ADMIN]: 'Awaiting Admin',
    [RoundStatus.PENDING_EMAIL]: 'Pending Email',
    [RoundStatus.EMAIL_SENT]: 'Email Sent',
  };
  return statusMap[status];
}

export function formatFinalDecision(decision: FinalDecision | null): string {
  if (!decision) return '—';
  const decisionMap: Record<FinalDecision, string> = {
    [FinalDecision.ACCEPTED]: 'Accepted',
    [FinalDecision.REJECTED]: 'Rejected',
  };
  return decisionMap[decision];
}

export function formatAcademicYear(year: AcademicYear): string {
  const yearMap: Record<AcademicYear, string> = {
    [AcademicYear.FIRST]: 'First',
    [AcademicYear.SECOND]: 'Second',
    [AcademicYear.THIRD]: 'Third',
    [AcademicYear.FOURTH]: 'Fourth',
    [AcademicYear.FIFTH]: 'Fifth',
  };
  return yearMap[year];
}

export const STATUS_TABS: { label: string; value: RoundStatus }[] = [
  { label: 'Pending', value: RoundStatus.PENDING },
  { label: 'In Progress', value: RoundStatus.IN_PROGRESS },
  { label: 'Awaiting Admin', value: RoundStatus.AWAITING_ADMIN },
  { label: 'Pending Email', value: RoundStatus.PENDING_EMAIL },
  { label: 'Final Decisions', value: RoundStatus.EMAIL_SENT },
];
