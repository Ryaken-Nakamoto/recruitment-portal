import { ApplicationRound, ReviewStatus } from './enums';

export interface RecruiterAssignmentDto {
  assignmentId: number;
  application: {
    id: number;
    round: ApplicationRound;
    applicantName: string;
    graduationYear: number;
    reviewsTotal: number;
    reviewsSubmitted: number;
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
}

export interface ExecuteAssignmentResponse {
  assigned: number;
  skippedAppIds: number[];
}

export interface AddReviewerRequest {
  applicationId: number;
  recruiterId: number;
}

export interface AddReviewerResponse {
  assignmentId: number;
  recruiterId: number;
  recruiterName: string;
  roundStatus: string;
}

export interface RemoveReviewerConflictResponse {
  conflict: true;
  hasReview: true;
  recruiterName: string;
}

export interface RemoveReviewerSuccessResponse {
  conflict: false;
  roundStatus: string;
}

export type RemoveReviewerResponse =
  | RemoveReviewerConflictResponse
  | RemoveReviewerSuccessResponse;

export interface AssignmentDetailCriteria {
  id: number;
  name: string;
  oneDescription: string;
  twoDescription: string;
  threeDescription: string;
  score: number | null;
}

export interface AssignmentDetailResponse {
  assignmentId: number;
  notes: string | null;
  application: {
    id: number;
    applicantName: string;
    email: string;
    major: string;
    academicYear: string;
    round: string;
    roundStatus: string;
    whyC4C: string;
    selfStartedProject: string;
    communityImpact: string;
    teamConflict: string;
    otherExperiences: string;
  };
  reviewStatus: 'not_started' | 'submitted';
  rubricCriteria: AssignmentDetailCriteria[];
}

export interface AssignmentReviewerInfo {
  assignmentId: number;
  recruiterId: number;
  recruiterName: string;
  reviewStatus: 'not_started' | 'submitted';
}

export interface RecruiterDetailAssignment {
  assignmentId: number;
  applicationId: number;
  applicantName: string;
  round: string;
  roundStatus: string;
  reviewStatus: string;
  assignedAt: string;
}

export interface AdminApplicationReview {
  assignmentId: number;
  recruiterName: string;
  reviewStatus: 'not_started' | 'submitted';
  notes: string | null;
  rubricCriteria: AssignmentDetailCriteria[];
}

export interface RecruiterDetailResponse {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  accountStatus: string;
  createdDate: string;
  stats: {
    total: number;
    submitted: number;
    notStarted: number;
    inProgress: number;
  };
  assignments: RecruiterDetailAssignment[];
}
