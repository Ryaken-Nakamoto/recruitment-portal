import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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

const makeAssignment = (
  id: number,
  round: ApplicationRound,
  applicantName: string,
) => ({
  assignmentId: id,
  application: {
    id: id * 10,
    round,
    applicantName,
    graduationYear: 2026,
    reviewsTotal: 0,
    reviewsSubmitted: 0,
  },
  reviewStatus: 'not_started' as const,
});

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
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <RecruiterHomePage />
      </QueryClientProvider>
    </MemoryRouter>,
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

  it('renders the page title', async () => {
    mockGetMyAssignments.mockResolvedValue(makeResponse());
    renderPage();
    expect(await screen.findByText(/my assignments/i)).toBeTruthy();
  });

  it('renders applicant name and round', async () => {
    mockGetMyAssignments.mockResolvedValue(
      makeResponse({
        data: [makeAssignment(1, ApplicationRound.SCREENING, 'Alice Smith')],
        total: 1,
        totalPages: 1,
      }),
    );
    renderPage();

    expect(await screen.findByText('Alice Smith')).toBeTruthy();
    expect(screen.getByText('Screening')).toBeTruthy();
  });

  it('renders correct round label for Technical Interview', async () => {
    mockGetMyAssignments.mockResolvedValue(
      makeResponse({
        data: [
          makeAssignment(2, ApplicationRound.TECHNICAL_INTERVIEW, 'Bob Jones'),
        ],
        total: 1,
        totalPages: 1,
      }),
    );
    renderPage();

    expect(await screen.findByText('Technical Interview')).toBeTruthy();
    expect(screen.getByText('Bob Jones')).toBeTruthy();
  });

  it('renders multiple assignments in the table', async () => {
    mockGetMyAssignments.mockResolvedValue(
      makeResponse({
        data: [
          makeAssignment(1, ApplicationRound.SCREENING, 'Alice Smith'),
          makeAssignment(2, ApplicationRound.BEHAVIORAL_INTERVIEW, 'Bob Jones'),
        ],
        total: 2,
        totalPages: 1,
      }),
    );
    renderPage();

    expect(await screen.findByText('Alice Smith')).toBeTruthy();
    expect(screen.getByText('Bob Jones')).toBeTruthy();
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
        data: Array.from({ length: 20 }, (_, i) =>
          makeAssignment(
            i + 1,
            ApplicationRound.SCREENING,
            `Applicant ${i + 1}`,
          ),
        ),
        total: 45,
        totalPages: 3,
      }),
    );
    renderPage();
    expect(await screen.findByRole('navigation')).toBeTruthy();
  });
});
