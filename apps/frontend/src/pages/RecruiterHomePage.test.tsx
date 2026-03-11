import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import apiClient from '@api/apiClient';
import RecruiterHomePage from './RecruiterHomePage';
import { ApplicationRound } from '@api/dtos/enums';
import { RecruiterAssignmentsResponse } from '@api/dtos/assignment.dto';

vi.mock('@api/apiClient', () => ({
  default: {
    getMyAssignments: vi.fn(),
  },
}));

const mockGetMyAssignments = vi.mocked(apiClient.getMyAssignments);

const makeResponse = (
  overrides: Partial<RecruiterAssignmentsResponse> = {},
): RecruiterAssignmentsResponse => ({
  data: [],
  total: 0,
  page: 1,
  totalPages: 0,
  ...overrides,
});

const renderPage = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <RecruiterHomePage />
    </QueryClientProvider>,
  );
};

describe('RecruiterHomePage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders a loading spinner while fetching', () => {
    mockGetMyAssignments.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('renders an error message when the fetch fails', async () => {
    mockGetMyAssignments.mockRejectedValue(new Error('Network error'));
    renderPage();
    expect(await screen.findByText(/failed to load assignments/i)).toBeTruthy();
  });

  it('renders empty state when no assignments exist', async () => {
    mockGetMyAssignments.mockResolvedValue(makeResponse());
    renderPage();
    expect(await screen.findByText(/no assignments yet/i)).toBeTruthy();
  });

  it('renders applicant name, round, graduation year, and review status', async () => {
    mockGetMyAssignments.mockResolvedValue(
      makeResponse({
        data: [
          {
            assignmentId: 1,
            application: {
              id: 10,
              round: ApplicationRound.SCREENING,
              applicantName: 'Alice Smith',
              graduationYear: 2026,
            },
            reviewStatus: 'not_started',
          },
        ],
        total: 1,
        totalPages: 1,
      }),
    );
    renderPage();

    expect(await screen.findByText('Alice Smith')).toBeTruthy();
    expect(screen.getByText('Screening')).toBeTruthy();
    expect(screen.getByText('2026')).toBeTruthy();
    expect(screen.getByText('Not Started')).toBeTruthy();
  });

  it('renders correct round label for Technical Interview', async () => {
    mockGetMyAssignments.mockResolvedValue(
      makeResponse({
        data: [
          {
            assignmentId: 2,
            application: {
              id: 20,
              round: ApplicationRound.TECHNICAL_INTERVIEW,
              applicantName: 'Bob Jones',
              graduationYear: 2025,
            },
            reviewStatus: 'draft',
          },
        ],
        total: 1,
        totalPages: 1,
      }),
    );
    renderPage();

    expect(await screen.findByText('Technical Interview')).toBeTruthy();
    expect(screen.getByText('Draft')).toBeTruthy();
  });

  it('renders multiple assignments in the table', async () => {
    mockGetMyAssignments.mockResolvedValue(
      makeResponse({
        data: [
          {
            assignmentId: 1,
            application: {
              id: 10,
              round: ApplicationRound.SCREENING,
              applicantName: 'Alice Smith',
              graduationYear: 2026,
            },
            reviewStatus: 'submitted',
          },
          {
            assignmentId: 2,
            application: {
              id: 20,
              round: ApplicationRound.BEHAVIORAL_INTERVIEW,
              applicantName: 'Bob Jones',
              graduationYear: 2027,
            },
            reviewStatus: 'approved',
          },
        ],
        total: 2,
        totalPages: 1,
      }),
    );
    renderPage();

    expect(await screen.findByText('Alice Smith')).toBeTruthy();
    expect(screen.getByText('Bob Jones')).toBeTruthy();
    expect(screen.getByText('Submitted')).toBeTruthy();
    expect(screen.getByText('Approved')).toBeTruthy();
  });

  it('does not show pagination when there is only one page', async () => {
    mockGetMyAssignments.mockResolvedValue(
      makeResponse({ total: 5, totalPages: 1 }),
    );
    renderPage();
    await screen.findByText(/my assignments/i);
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('shows pagination when there are multiple pages', async () => {
    mockGetMyAssignments.mockResolvedValue(
      makeResponse({
        data: Array.from({ length: 20 }, (_, i) => ({
          assignmentId: i + 1,
          application: {
            id: i + 1,
            round: ApplicationRound.SCREENING,
            applicantName: `Applicant ${i + 1}`,
            graduationYear: 2025,
          },
          reviewStatus: 'not_started' as const,
        })),
        total: 45,
        totalPages: 3,
      }),
    );
    renderPage();
    expect(await screen.findByRole('navigation')).toBeTruthy();
  });
});
