import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import apiClient from '@api/apiClient';
import { User } from '@api/dtos/user.dto';
import { Role, AccountStatus } from '@api/dtos/enums';
import ProfilePage from './ProfilePage';

vi.mock('@api/apiClient', () => ({ default: { updateProfile: vi.fn() } }));

const mockUpdateProfile = vi.mocked(apiClient.updateProfile);

const mockUser: User = {
  id: 1,
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  role: Role.RECRUITER,
  accountStatus: AccountStatus.ACTIVATED,
  createdDate: '2025-01-01',
};

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => [false, false, mockUser],
}));

const renderPage = () => {
  render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>,
  );
};

describe('ProfilePage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders pre-populated name fields', () => {
    renderPage();
    expect(
      (screen.getByLabelText('First Name') as HTMLInputElement).value,
    ).toBe('Jane');
    expect((screen.getByLabelText('Last Name') as HTMLInputElement).value).toBe(
      'Doe',
    );
  });

  it('renders read-only email field', () => {
    renderPage();
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe(
      'jane@example.com',
    );
  });

  it('disables save when values are unchanged', () => {
    renderPage();
    const btn = screen
      .getByText('Save Changes')
      .closest('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('enables save after editing a field', () => {
    renderPage();
    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: 'John' },
    });
    const btn = screen
      .getByText('Save Changes')
      .closest('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it('shows success snackbar after successful save', async () => {
    mockUpdateProfile.mockResolvedValue({ ...mockUser, firstName: 'John' });
    renderPage();
    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: 'John' },
    });
    fireEvent.click(screen.getByText('Save Changes'));
    expect(
      await screen.findByText('Profile updated successfully'),
    ).toBeTruthy();
  });

  it('shows error snackbar when save fails', async () => {
    mockUpdateProfile.mockRejectedValue(new Error('fail'));
    renderPage();
    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: 'John' },
    });
    fireEvent.click(screen.getByText('Save Changes'));
    expect(await screen.findByText(/failed to save profile/i)).toBeTruthy();
  });
});
