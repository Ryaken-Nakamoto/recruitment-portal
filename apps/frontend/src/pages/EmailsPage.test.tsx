import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import apiClient from '@api/apiClient';
import EmailsPage from './EmailsPage';
import { ApplicationRound, FinalDecision } from '@api/dtos/enums';

vi.mock('@api/apiClient', () => ({
  default: {
    getEmails: vi.fn(),
    getEmailVariables: vi.fn(),
  },
}));

const mockGetEmails = vi.mocked(apiClient.getEmails);
const mockGetEmailVariables = vi.mocked(apiClient.getEmailVariables);

const makeEmail = (
  id: number,
  stage: ApplicationRound,
  decision: FinalDecision,
) => ({
  id,
  name: `${stage}-${decision}`,
  subject: `Subject ${id}`,
  body: `Body ${id}`,
  applicationStage: stage,
  decision,
  requiredVariables: [],
  defaultContext: {},
});

const SIX_EMAILS = [
  makeEmail(1, ApplicationRound.SCREENING, FinalDecision.ACCEPTED),
  makeEmail(2, ApplicationRound.SCREENING, FinalDecision.REJECTED),
  makeEmail(3, ApplicationRound.TECHNICAL_INTERVIEW, FinalDecision.ACCEPTED),
  makeEmail(4, ApplicationRound.TECHNICAL_INTERVIEW, FinalDecision.REJECTED),
  makeEmail(5, ApplicationRound.BEHAVIORAL_INTERVIEW, FinalDecision.ACCEPTED),
  makeEmail(6, ApplicationRound.BEHAVIORAL_INTERVIEW, FinalDecision.REJECTED),
];

const renderPage = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <EmailsPage />
    </QueryClientProvider>,
  );
};

describe('EmailsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders a loading spinner while fetching', () => {
    mockGetEmails.mockReturnValue(new Promise(() => {}));
    mockGetEmailVariables.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('renders an error message when the fetch fails', async () => {
    mockGetEmails.mockRejectedValue(new Error('Network error'));
    mockGetEmailVariables.mockResolvedValue([]);
    renderPage();
    expect(
      await screen.findByText(/failed to load email templates/i),
    ).toBeTruthy();
  });

  it('renders 6 email cards on success', async () => {
    mockGetEmails.mockResolvedValue(SIX_EMAILS);
    mockGetEmailVariables.mockResolvedValue(['firstName', 'lastName']);
    renderPage();
    // Each card shows the email name
    for (const email of SIX_EMAILS) {
      expect(await screen.findByText(email.name)).toBeTruthy();
    }
  });
});
