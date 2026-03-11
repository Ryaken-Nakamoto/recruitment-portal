import { ApplicationRound, FinalDecision } from './enums';

export interface EmailDto {
  id: number;
  name: string;
  subject: string;
  body: string;
  applicationStage: ApplicationRound;
  decision: FinalDecision;
  requiredVariables: string[];
  defaultContext: Record<string, string>;
}

export interface UpdateEmailDto {
  subject?: string;
  body?: string;
}
