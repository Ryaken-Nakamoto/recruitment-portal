import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthedApp } from './AuthedApp';
import { useAuth } from '../hooks/useAuth';
import { Role, AccountStatus } from '@api/dtos/enums';
import { User } from '@api/dtos/user.dto';

vi.mock('../hooks/useAuth');
const mockUseAuth = vi.mocked(useAuth);

const makeUser = (role: Role): User => ({
  id: 1,
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  role,
  accountStatus: AccountStatus.ACTIVATED,
  createdDate: '2024-01-01',
});

const setup = (
  authState: ReturnType<typeof useAuth>,
  allowedRoles: Role[] = [Role.RECRUITER],
) => {
  mockUseAuth.mockReturnValue(authState);
  render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/recruiter/home" element={<div>Recruiter Home</div>} />
        <Route
          path="/protected"
          element={<AuthedApp allowedRoles={allowedRoles} />}
        >
          <Route index element={<div>Protected Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
};

describe('AuthedApp', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows loading state while auth is resolving', () => {
    setup([true, false, undefined]);
    expect(screen.getByText('Loading...')).toBeTruthy();
  });

  it('shows an error message when auth fails', () => {
    setup([false, true, undefined]);
    expect(screen.getByText(/unable to load user/i)).toBeTruthy();
  });

  it('redirects to /login when user is not authenticated', () => {
    setup([false, false, undefined]);
    expect(screen.getByText('Login Page')).toBeTruthy();
  });

  it('renders the outlet when user has the required role', () => {
    setup([false, false, makeUser(Role.RECRUITER)], [Role.RECRUITER]);
    expect(screen.getByText('Protected Content')).toBeTruthy();
  });

  it('redirects to /recruiter/home when recruiter lacks the required role', () => {
    setup([false, false, makeUser(Role.RECRUITER)], [Role.ADMIN]);
    expect(screen.getByText('Recruiter Home')).toBeTruthy();
  });

  it('grants admin access to recruiter routes via role hierarchy', () => {
    setup([false, false, makeUser(Role.ADMIN)], [Role.RECRUITER]);
    expect(screen.getByText('Protected Content')).toBeTruthy();
  });
});
