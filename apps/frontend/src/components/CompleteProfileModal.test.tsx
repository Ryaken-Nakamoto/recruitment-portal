import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import apiClient from '@api/apiClient';
import { User } from '@api/dtos/user.dto';
import { Role, AccountStatus } from '@api/dtos/enums';
import { CompleteProfileModal } from './CompleteProfileModal';

vi.mock('@api/apiClient', () => ({ default: { updateProfile: vi.fn() } }));

const mockUpdateProfile = vi.mocked(apiClient.updateProfile);

const updatedUser: User = {
  id: 1,
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  role: Role.RECRUITER,
  accountStatus: AccountStatus.ACTIVATED,
  createdDate: '2025-01-01',
};

const renderModal = (onComplete = vi.fn(), user?: User) => {
  render(
    <CompleteProfileModal open={true} user={user} onComplete={onComplete} />,
  );
};

describe('CompleteProfileModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders both name fields', () => {
    renderModal();
    expect(screen.getByLabelText(/first name/i)).toBeTruthy();
    expect(screen.getByLabelText(/last name/i)).toBeTruthy();
  });

  it('autofills first and last name from user prop', () => {
    const user: User = {
      ...updatedUser,
      firstName: 'John',
      lastName: 'Smith',
    };
    renderModal(vi.fn(), user);
    expect(screen.getByDisplayValue('John')).toBeTruthy();
    expect(screen.getByDisplayValue('Smith')).toBeTruthy();
  });

  it('autofills with empty strings when user has null names', () => {
    const user: User = {
      ...updatedUser,
      firstName: null,
      lastName: null,
    };
    renderModal(vi.fn(), user);
    const firstNameInput = screen.getByLabelText(
      /first name/i,
    ) as HTMLInputElement;
    const lastNameInput = screen.getByLabelText(
      /last name/i,
    ) as HTMLInputElement;
    expect(firstNameInput.value).toBe('');
    expect(lastNameInput.value).toBe('');
  });

  it('shows validation errors when submitted empty', async () => {
    renderModal();
    fireEvent.click(screen.getByText('Submit'));
    expect(await screen.findByText('First name is required')).toBeTruthy();
    expect(screen.getByText('Last name is required')).toBeTruthy();
  });

  it('calls updateProfile with trimmed values on valid submit', async () => {
    mockUpdateProfile.mockResolvedValue(updatedUser);
    const onComplete = vi.fn();
    renderModal(onComplete);

    fireEvent.change(screen.getByLabelText(/first name/i), {
      target: { value: 'Jane' },
    });
    fireEvent.change(screen.getByLabelText(/last name/i), {
      target: { value: 'Doe' },
    });
    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => expect(onComplete).toHaveBeenCalledWith(updatedUser));
    expect(mockUpdateProfile).toHaveBeenCalledWith({
      firstName: 'Jane',
      lastName: 'Doe',
    });
  });

  it('shows error alert when updateProfile fails', async () => {
    mockUpdateProfile.mockRejectedValue(new Error('Network error'));
    renderModal();

    fireEvent.change(screen.getByLabelText(/first name/i), {
      target: { value: 'Jane' },
    });
    fireEvent.change(screen.getByLabelText(/last name/i), {
      target: { value: 'Doe' },
    });
    fireEvent.click(screen.getByText('Submit'));

    expect(await screen.findByText(/failed to save/i)).toBeTruthy();
  });

  it('does not call onComplete on failure', async () => {
    mockUpdateProfile.mockRejectedValue(new Error('fail'));
    const onComplete = vi.fn();
    renderModal(onComplete);

    fireEvent.change(screen.getByLabelText(/first name/i), {
      target: { value: 'Jane' },
    });
    fireEvent.change(screen.getByLabelText(/last name/i), {
      target: { value: 'Doe' },
    });
    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() =>
      expect(screen.queryByText(/failed to save/i)).toBeTruthy(),
    );
    expect(onComplete).not.toHaveBeenCalled();
  });
});
