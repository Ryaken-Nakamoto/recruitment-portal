import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import apiClient from '@api/apiClient';
import EmailEditorDialog from './EmailEditorDialog';
import { ApplicationRound, FinalDecision } from '@api/dtos/enums';

vi.mock('@api/apiClient', () => ({
  default: {
    updateEmail: vi.fn(),
  },
}));

const mockUpdateEmail = vi.mocked(apiClient.updateEmail);

const MOCK_EMAIL = {
  id: 1,
  name: 'screening-accepted',
  subject: 'Test Subject',
  body: 'Hello {{firstName}}',
  applicationStage: ApplicationRound.SCREENING,
  decision: FinalDecision.ACCEPTED,
  requiredVariables: [],
  defaultContext: {},
};

const renderDialog = (
  props: Partial<React.ComponentProps<typeof EmailEditorDialog>> = {},
) => {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <EmailEditorDialog
        email={MOCK_EMAIL}
        autoVariables={['firstName', 'lastName']}
        onClose={vi.fn()}
        {...props}
      />
    </QueryClientProvider>,
  );
};

describe('EmailEditorDialog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders subject and body from props', () => {
    renderDialog();
    expect(screen.getByDisplayValue('Test Subject')).toBeTruthy();
    expect(screen.getByDisplayValue('Hello {{firstName}}')).toBeTruthy();
  });

  it('inserts {{firstName}} into body when Insert First Name chip is clicked', async () => {
    renderDialog();
    const bodyField = screen.getByDisplayValue(
      'Hello {{firstName}}',
    ) as HTMLTextAreaElement;
    // Position cursor at end
    fireEvent.focus(bodyField);
    bodyField.setSelectionRange(bodyField.value.length, bodyField.value.length);

    fireEvent.click(screen.getByText(/insert first name/i));

    await waitFor(() => {
      expect(
        (screen.getByDisplayValue(/\{\{firstName\}\}/) as HTMLTextAreaElement)
          .value,
      ).toContain('{{firstName}}');
    });
  });

  it('calls updateEmail with updated values when Save is clicked', async () => {
    mockUpdateEmail.mockResolvedValue({
      ...MOCK_EMAIL,
      subject: 'New Subject',
    });
    renderDialog();

    const subjectField = screen.getByDisplayValue('Test Subject');
    fireEvent.change(subjectField, { target: { value: 'New Subject' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() =>
      expect(mockUpdateEmail).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ subject: 'New Subject' }),
      ),
    );
  });

  it('shows a success snackbar after saving', async () => {
    mockUpdateEmail.mockResolvedValue(MOCK_EMAIL);
    renderDialog();

    fireEvent.click(screen.getByText('Save'));

    expect(
      await screen.findByText(/template saved successfully/i),
    ).toBeTruthy();
  });
});
