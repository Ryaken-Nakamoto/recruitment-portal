import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ApplicationsPage, {
  formatRound,
  formatRoundStatus,
  formatFinalDecision,
  formatAcademicYear,
} from './ApplicationsPage';
import {
  ApplicationRound,
  RoundStatus,
  FinalDecision,
  AcademicYear,
} from '@api/dtos/enums';
import apiClient from '@api/apiClient';

vi.mock('@api/apiClient', () => ({
  default: {
    getApplications: vi.fn(),
  },
}));

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

const mockGetApplications = vi.mocked(apiClient.getApplications);

describe('ApplicationsPage format helpers', () => {
  describe('formatRound', () => {
    it('formats all round values correctly', () => {
      expect(formatRound(ApplicationRound.SCREENING)).toBe('Screening');
      expect(formatRound(ApplicationRound.TECHNICAL_INTERVIEW)).toBe(
        'Technical Interview',
      );
      expect(formatRound(ApplicationRound.BEHAVIORAL_INTERVIEW)).toBe(
        'Behavioral Interview',
      );
    });
  });

  describe('formatRoundStatus', () => {
    it('formats all round status values correctly', () => {
      expect(formatRoundStatus(RoundStatus.PENDING)).toBe('Pending');
      expect(formatRoundStatus(RoundStatus.IN_PROGRESS)).toBe('In Progress');
      expect(formatRoundStatus(RoundStatus.AWAITING_ADMIN)).toBe(
        'Awaiting Admin',
      );
      expect(formatRoundStatus(RoundStatus.PENDING_EMAIL)).toBe(
        'Pending Email',
      );
      expect(formatRoundStatus(RoundStatus.EMAIL_SENT)).toBe('Email Sent');
    });
  });

  describe('formatFinalDecision', () => {
    it('formats accepted decision', () => {
      expect(formatFinalDecision(FinalDecision.ACCEPTED)).toBe('Accepted');
    });

    it('formats rejected decision', () => {
      expect(formatFinalDecision(FinalDecision.REJECTED)).toBe('Rejected');
    });

    it('returns dash for null decision', () => {
      expect(formatFinalDecision(null)).toBe('—');
    });
  });

  describe('formatAcademicYear', () => {
    it('formats all academic year values correctly', () => {
      expect(formatAcademicYear(AcademicYear.FIRST)).toBe('First');
      expect(formatAcademicYear(AcademicYear.SECOND)).toBe('Second');
      expect(formatAcademicYear(AcademicYear.THIRD)).toBe('Third');
      expect(formatAcademicYear(AcademicYear.FOURTH)).toBe('Fourth');
      expect(formatAcademicYear(AcademicYear.FIFTH)).toBe('Fifth');
    });
  });
});

describe('ApplicationsPage component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state', () => {
    mockGetApplications.mockReturnValue(
      new Promise(() => {}), // never resolves
    );

    render(
      <MemoryRouter>
        <QueryClientProvider client={createQueryClient()}>
          <ApplicationsPage />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('shows error state on fetch failure', async () => {
    mockGetApplications.mockRejectedValue(new Error('Network error'));

    render(
      <MemoryRouter>
        <QueryClientProvider client={createQueryClient()}>
          <ApplicationsPage />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Failed to load applications/)).toBeTruthy();
  });

  it('renders table with application rows', async () => {
    const mockData = {
      data: [
        {
          id: 1,
          round: ApplicationRound.SCREENING,
          roundStatus: RoundStatus.PENDING,
          finalDecision: null,
          submittedAt: '2026-03-01T10:00:00Z',
          applicant: {
            id: 1,
            name: 'Alice Smith',
            email: 'alice@example.com',
            major: 'CS',
            academicYear: AcademicYear.FIRST,
            graduationYear: null,
          },
        },
      ],
      total: 1,
      page: 1,
      totalPages: 1,
    };

    mockGetApplications.mockResolvedValue(mockData);

    render(
      <MemoryRouter>
        <QueryClientProvider client={createQueryClient()}>
          <ApplicationsPage />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Alice Smith')).toBeTruthy();
    expect(screen.getByText('alice@example.com')).toBeTruthy();
    expect(screen.getByText('CS')).toBeTruthy();
    expect(screen.getByText('First')).toBeTruthy();
    expect(screen.getByText('Screening')).toBeTruthy();
  });

  it('shows empty state when no applications', async () => {
    const mockData = {
      data: [],
      total: 0,
      page: 1,
      totalPages: 0,
    };

    mockGetApplications.mockResolvedValue(mockData);

    render(
      <MemoryRouter>
        <QueryClientProvider client={createQueryClient()}>
          <ApplicationsPage />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('No applications found')).toBeTruthy();
  });

  it('shows pagination only when totalPages > 1', async () => {
    const mockData = {
      data: [],
      total: 50,
      page: 1,
      totalPages: 3,
    };

    mockGetApplications.mockResolvedValue(mockData);

    render(
      <MemoryRouter>
        <QueryClientProvider client={createQueryClient()}>
          <ApplicationsPage />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('navigation')).toBeTruthy();
  });
});
