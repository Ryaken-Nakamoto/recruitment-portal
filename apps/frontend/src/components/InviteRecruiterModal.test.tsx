import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import apiClient from '@api/apiClient';
import { User } from '@api/dtos/user.dto';
import InviteRecruiterModal, { validate } from './InviteRecruiterModal';

vi.mock('@api/apiClient', () => ({ default: { inviteRecruiter: vi.fn() } }));
vi.mock('axios');

const mockInviteRecruiter = vi.mocked(apiClient.inviteRecruiter);

const renderModal = (
  props: Partial<React.ComponentProps<typeof InviteRecruiterModal>> = {},
) => {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <InviteRecruiterModal
        open={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        onError={vi.fn()}
        {...props}
      />
    </QueryClientProvider>,
  );
};

// --- validate (pure function) ---

describe('validate', () => {
  it('returns an error for an empty email', () => {
    const errors = validate({ email: '' });
    expect(errors.email).toBeTruthy();
  });

  it('returns an error for whitespace-only email', () => {
    const errors = validate({ email: '   ' });
    expect(errors.email).toBeTruthy();
  });

  it('returns an email error for an invalid email format', () => {
    const errors = validate({ email: 'not-an-email' });
    expect(errors.email).toBeTruthy();
  });

  it('returns no errors for a valid email', () => {
    const errors = validate({ email: 'jane@example.com' });
    expect(Object.keys(errors)).toHaveLength(0);
  });
});

// --- InviteRecruiterModal component ---

describe('InviteRecruiterModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows only the email field', () => {
    renderModal();
    expect(screen.getByLabelText(/email/i)).toBeTruthy();
    expect(screen.queryByLabelText(/first name/i)).toBeNull();
    expect(screen.queryByLabelText(/last name/i)).toBeNull();
  });

  it('shows a validation error after submitting an empty form', async () => {
    renderModal();
    fireEvent.click(screen.getByText('Send Invite'));
    expect(await screen.findByText('Email is required')).toBeTruthy();
  });

  it('shows an email format error for an invalid email', async () => {
    renderModal();
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'bad-email' },
    });
    fireEvent.click(screen.getByText('Send Invite'));
    expect(
      await screen.findByText('Must be a valid email address'),
    ).toBeTruthy();
  });

  it('calls onSuccess with the email after a successful invite', async () => {
    const onSuccess = vi.fn();
    mockInviteRecruiter.mockResolvedValue({} as unknown as User);
    renderModal({ onSuccess });

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'jane@example.com' },
    });
    fireEvent.click(screen.getByText('Send Invite'));

    await waitFor(() =>
      expect(onSuccess).toHaveBeenCalledWith('jane@example.com'),
    );
  });

  it('shows a conflict error when the API returns 409', async () => {
    const axiosError = { response: { status: 409 } };
    vi.mocked(axios.isAxiosError).mockReturnValue(true);
    mockInviteRecruiter.mockRejectedValue(axiosError);
    renderModal();

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'jane@example.com' },
    });
    fireEvent.click(screen.getByText('Send Invite'));

    expect(await screen.findByText(/already exists/i)).toBeTruthy();
  });

  it('calls onError with fallback message for non-axios non-409 errors', async () => {
    const onError = vi.fn();
    vi.mocked(axios.isAxiosError).mockReturnValue(false);
    mockInviteRecruiter.mockRejectedValue(new Error('Server error'));
    renderModal({ onError });

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'jane@example.com' },
    });
    fireEvent.click(screen.getByText('Send Invite'));

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith(
        'Failed to send invite. Please try again.',
      ),
    );
  });

  it('passes backend error message to onError for non-409 axios errors', async () => {
    const onError = vi.fn();
    const axiosError = {
      response: {
        status: 500,
        data: {
          message: 'Failed to create login credentials. Please try again.',
        },
      },
    };
    vi.mocked(axios.isAxiosError).mockReturnValue(true);
    mockInviteRecruiter.mockRejectedValue(axiosError);
    renderModal({ onError });

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'jane@example.com' },
    });
    fireEvent.click(screen.getByText('Send Invite'));

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith(
        'Failed to create login credentials. Please try again.',
      ),
    );
  });
});
