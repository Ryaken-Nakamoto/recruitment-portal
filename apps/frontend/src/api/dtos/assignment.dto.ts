import { ApplicationRound, ReviewStatus } from './enums';

export interface RecruiterAssignmentDto {
  assignmentId: number;
  application: {
    id: number;
    round: ApplicationRound;
    applicantName: string;
    graduationYear: number;
  };
  reviewStatus: ReviewStatus;
}

export interface RecruiterAssignmentsResponse {
  data: RecruiterAssignmentDto[];
  total: number;
  page: number;
  totalPages: number;
}

export interface RecruiterSummaryDto {
  id: number;
  firstName: string;
  lastName: string;
}

export interface ExecuteAssignmentRequest {
  applicationIds: number[];
  recruiterIds: number[];
  recruitersPerApp: number;
  force?: boolean;
}

export interface ConflictingApp {
  id: number;
  applicantName: string;
}

export interface AssignmentConflictError {
  statusCode: 409;
  blockType: 'submitted' | 'in_progress';
  conflictingApps: ConflictingApp[];
}

export interface ExecuteAssignmentResponse {
  assigned: number;
}
