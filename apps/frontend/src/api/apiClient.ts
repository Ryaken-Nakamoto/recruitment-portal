import axios, { type AxiosInstance } from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';
import { User } from './dtos/user.dto';
import { RubricsResponse } from './dtos/rubric.dto';
import { EmailDto, UpdateEmailDto } from './dtos/email.dto';
import { ApplicationRound } from './dtos/enums';
import { ApplicationSummaryDto } from './dtos/application.dto';
import {
  ExecuteAssignmentRequest,
  ExecuteAssignmentResponse,
  RecruiterAssignmentsResponse,
  RecruiterSummaryDto,
} from './dtos/assignment.dto';

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
