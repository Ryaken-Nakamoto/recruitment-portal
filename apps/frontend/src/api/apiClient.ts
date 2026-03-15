import axios, { type AxiosInstance } from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';
import { User } from './dtos/user.dto';
import { RubricsResponse } from './dtos/rubric.dto';
import { EmailDto, UpdateEmailDto } from './dtos/email.dto';
import { ApplicationRound, RoundStatus } from './dtos/enums';
import {
  ApplicationSummaryDto,
  ApplicationsListResponse,
  BulkDecideRequest,
  BulkDecideResponse,
} from './dtos/application.dto';
import { ApplicationDetailResponse } from './dtos/application-detail.dto';
import {
  AddReviewerRequest,
  AddReviewerResponse,
  AdminApplicationReview,
  AssignmentDetailResponse,
  AssignmentReviewerInfo,
  ExecuteAssignmentRequest,
  ExecuteAssignmentResponse,
  RecruiterAssignmentsResponse,
  RecruiterDetailResponse,
  RecruiterSummaryDto,
  RemoveReviewerResponse,
} from './dtos/assignment.dto';
import {
  EmailPreviewDto,
  SentEmailDetailDto,
  SentEmailsListResponse,
} from './dtos/sent-email.dto';

export interface RecruiterListResponse {
  data: User[];
  total: number;
  page: number;
  totalPages: number;
}

export interface InviteRecruiterRequest {
  firstName: string;
  lastName: string;
  email: string;
}

const defaultBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export class ApiClient {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({ baseURL: defaultBaseUrl });

    this.axiosInstance.interceptors.request.use(async (config) => {
      // ─── DEV ONLY ─ remove before shipping ─────────────────────────────────────
      if (import.meta.env.VITE_DEV_AUTH_BYPASS === 'true') {
        const devEmail = localStorage.getItem('dev_user_email');
        if (devEmail) {
          config.headers['X-Dev-User-Email'] = devEmail;
        }
        return config;
      }
      // ─────────────────────────────────────────────────────────────────────────────
      try {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch {
        // No session available, proceed without token
      }
      return config;
    });
  }

  public async getHello(): Promise<string> {
    return this.get('/api') as Promise<string>;
  }

  public async getMe(): Promise<User> {
    return this.get('/api/auth/me') as Promise<User>;
  }

  public async getRecruiters(
    page: number = 1,
    limit: number = 20,
  ): Promise<RecruiterListResponse> {
    return this.get(
      `/api/admin/recruiters?page=${page}&limit=${limit}`,
    ) as Promise<RecruiterListResponse>;
  }

  public async getApplicationDetail(
    id: number,
  ): Promise<ApplicationDetailResponse> {
    return this.get(
      `/api/admin/applications/${id}`,
    ) as Promise<ApplicationDetailResponse>;
  }

  public async getApplications(
    page: number = 1,
    limit: number = 20,
    roundStatus?: RoundStatus,
    avgScoreSort?: 'asc' | 'desc',
  ): Promise<ApplicationsListResponse> {
    const qs = roundStatus ? `&roundStatus=${roundStatus}` : '';
    const sortQs = avgScoreSort ? `&sortAvgScore=${avgScoreSort}` : '';
    return this.get(
      `/api/admin/applications?page=${page}&limit=${limit}${qs}${sortQs}`,
    ) as Promise<ApplicationsListResponse>;
  }

  public async bulkDecide(dto: BulkDecideRequest): Promise<BulkDecideResponse> {
    return this.patch(
      '/api/admin/applications/bulk-decide',
      dto,
    ) as Promise<BulkDecideResponse>;
  }

  public async inviteRecruiter(dto: InviteRecruiterRequest): Promise<User> {
    return this.post('/api/admin/recruiters/invite', dto) as Promise<User>;
  }

  public async getRubrics(): Promise<RubricsResponse> {
    return this.get('/api/rubrics') as Promise<RubricsResponse>;
  }

  public async getEmails(): Promise<EmailDto[]> {
    return this.get('/api/emails') as Promise<EmailDto[]>;
  }

  public async getEmailVariables(): Promise<string[]> {
    return this.get('/api/emails/variables') as Promise<string[]>;
  }

  public async updateEmail(id: number, dto: UpdateEmailDto): Promise<EmailDto> {
    return this.patch(`/api/emails/${id}`, dto) as Promise<EmailDto>;
  }

  public async getAssignmentApplications(
    round?: ApplicationRound,
  ): Promise<ApplicationSummaryDto[]> {
    const qs = round ? `?round=${round}` : '';
    return this.get(`/api/admin/assignments/applications${qs}`) as Promise<
      ApplicationSummaryDto[]
    >;
  }

  public async getActiveRecruiters(): Promise<RecruiterSummaryDto[]> {
    return this.get('/api/admin/assignments/recruiters') as Promise<
      RecruiterSummaryDto[]
    >;
  }

  public async executeAssignment(
    dto: ExecuteAssignmentRequest,
  ): Promise<ExecuteAssignmentResponse> {
    return this.post(
      '/api/admin/assignments/execute',
      dto,
    ) as Promise<ExecuteAssignmentResponse>;
  }

  public async getMyAssignments(
    page: number = 1,
    limit: number = 20,
  ): Promise<RecruiterAssignmentsResponse> {
    return this.get(
      `/api/recruiter/assignments?page=${page}&limit=${limit}`,
    ) as Promise<RecruiterAssignmentsResponse>;
  }

  public async getAssignmentDetail(
    assignmentId: number,
  ): Promise<AssignmentDetailResponse> {
    return this.get(
      `/api/recruiter/assignments/${assignmentId}`,
    ) as Promise<AssignmentDetailResponse>;
  }

  public async getAssignmentByApplication(
    applicationId: number,
  ): Promise<AssignmentDetailResponse> {
    return this.get(
      `/api/recruiter/assignments/by-application/${applicationId}`,
    ) as Promise<AssignmentDetailResponse>;
  }

  public async updateAssignmentNotes(
    assignmentId: number,
    notes: string | null,
  ): Promise<{ assignmentId: number; notes: string | null }> {
    return this.patch(`/api/recruiter/assignments/${assignmentId}/notes`, {
      notes,
    }) as Promise<{ assignmentId: number; notes: string | null }>;
  }

  public async submitScreeningReview(dto: {
    assignmentId: number;
    scores: { criteriaId: number; score: number }[];
  }): Promise<{ id: number }> {
    return this.post('/api/recruiter/reviews/screening', dto) as Promise<{
      id: number;
    }>;
  }

  public async addReviewer(
    dto: AddReviewerRequest,
  ): Promise<AddReviewerResponse> {
    return this.post(
      '/api/admin/assignments/add',
      dto,
    ) as Promise<AddReviewerResponse>;
  }

  public async removeReviewer(
    assignmentId: number,
    force = false,
  ): Promise<RemoveReviewerResponse> {
    return this.delete(
      `/api/admin/assignments/${assignmentId}${force ? '?force=true' : ''}`,
    ) as Promise<RemoveReviewerResponse>;
  }

  public async getApplicationDetailRecruiter(
    id: number,
  ): Promise<ApplicationDetailResponse> {
    return this.get(
      `/api/recruiter/applications/${id}`,
    ) as Promise<ApplicationDetailResponse>;
  }

  public async getApplicationAssignments(
    applicationId: number,
  ): Promise<AssignmentReviewerInfo[]> {
    return this.get(
      `/api/admin/assignments/application/${applicationId}`,
    ) as Promise<AssignmentReviewerInfo[]>;
  }

  public async getApplicationReviews(
    applicationId: number,
  ): Promise<AdminApplicationReview[]> {
    return this.get(
      `/api/admin/assignments/application/${applicationId}/reviews`,
    ) as Promise<AdminApplicationReview[]>;
  }

  public async getCoReviewers(
    applicationId: number,
  ): Promise<AssignmentReviewerInfo[]> {
    return this.get(
      `/api/recruiter/assignments/by-application/${applicationId}/co-reviewers`,
    ) as Promise<AssignmentReviewerInfo[]>;
  }

  public async getRecruiterDetail(
    id: number,
  ): Promise<RecruiterDetailResponse> {
    return this.get(
      `/api/admin/recruiters/${id}`,
    ) as Promise<RecruiterDetailResponse>;
  }

  public async deactivateRecruiter(id: number): Promise<User> {
    return this.patch(
      `/api/admin/recruiters/${id}/deactivate`,
      {},
    ) as Promise<User>;
  }

  public async reactivateRecruiter(id: number): Promise<User> {
    return this.patch(
      `/api/admin/recruiters/${id}/reactivate`,
      {},
    ) as Promise<User>;
  }

  public async getEmailPreview(
    applicationId: number,
  ): Promise<EmailPreviewDto> {
    return this.get(
      `/api/admin/applications/${applicationId}/email-preview`,
    ) as Promise<EmailPreviewDto>;
  }

  public async sendApplicationEmail(
    applicationId: number,
    dto: { subject: string; body: string },
  ): Promise<void> {
    await this.patch(
      `/api/admin/applications/${applicationId}/send-email`,
      dto,
    );
  }

  public async getSentEmails(
    page: number = 1,
    limit: number = 20,
  ): Promise<SentEmailsListResponse> {
    return this.get(
      `/api/admin/sent-emails?page=${page}&limit=${limit}`,
    ) as Promise<SentEmailsListResponse>;
  }

  public async getSentEmail(id: number): Promise<SentEmailDetailDto> {
    return this.get(
      `/api/admin/sent-emails/${id}`,
    ) as Promise<SentEmailDetailDto>;
  }

  public async downloadResume(applicationId: number): Promise<void> {
    const response = await this.axiosInstance.get(
      `/api/admin/applications/${applicationId}/resume`,
      { responseType: 'blob' },
    );
    const disposition =
      (response.headers['content-disposition'] as string) ?? '';
    const match = disposition.match(/filename="([^"]+)"/);
    const filename = match ? match[1] : 'resume.pdf';
    const url = URL.createObjectURL(response.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  private async get(path: string): Promise<unknown> {
    return this.axiosInstance.get(path).then((response) => response.data);
  }

  private async post(path: string, body: unknown): Promise<unknown> {
    return this.axiosInstance
      .post(path, body)
      .then((response) => response.data);
  }

  private async patch(path: string, body: unknown): Promise<unknown> {
    return this.axiosInstance
      .patch(path, body)
      .then((response) => response.data);
  }

  private async delete(path: string): Promise<unknown> {
    return this.axiosInstance.delete(path).then((response) => response.data);
  }
}

export default new ApiClient();
