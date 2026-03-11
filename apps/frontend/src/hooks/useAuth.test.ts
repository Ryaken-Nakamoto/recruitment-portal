import { renderHook, waitFor } from '@testing-library/react';
import { fetchAuthSession } from 'aws-amplify/auth';
import apiClient from '@api/apiClient';
import { useAuth } from './useAuth';
import { Role, AccountStatus } from '@api/dtos/enums';

vi.mock('aws-amplify/auth', () => ({ fetchAuthSession: vi.fn() }));
vi.mock('@api/apiClient', () => ({ default: { getMe: vi.fn() } }));

const mockFetchAuthSession = vi.mocked(fetchAuthSession);
const mockGetMe = vi.mocked(apiClient.getMe);

const makeSession = (hasToken = true) => ({
  tokens: hasToken ? { idToken: { toString: () => 'id-token' } } : undefined,
});

const makeUser = () => ({
  id: 1,
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  role: Role.RECRUITER,
  accountStatus: AccountStatus.ACTIVATED,
  createdDate: '2024-01-01',
});

describe('useAuth', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns loading=true on initial render', () => {
    mockFetchAuthSession.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useAuth());
    const [isLoading, isError, user] = result.current;
    expect(isLoading).toBe(true);
    expect(isError).toBe(false);
    expect(user).toBeUndefined();
  });

  it('returns user when session and getMe both succeed', async () => {
    const user = makeUser();
    mockFetchAuthSession.mockResolvedValue(makeSession(true));
    mockGetMe.mockResolvedValue(user);

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current[0]).toBe(false));

    const [isLoading, isError, returnedUser] = result.current;
    expect(isLoading).toBe(false);
    expect(isError).toBe(false);
    expect(returnedUser).toBe(user);
  });

  it('returns undefined user (no error) when there is no session token', async () => {
    mockFetchAuthSession.mockResolvedValue(makeSession(false));

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current[0]).toBe(false));

    const [isLoading, isError, user] = result.current;
    expect(isLoading).toBe(false);
    expect(isError).toBe(false);
    expect(user).toBeUndefined();
    expect(mockGetMe).not.toHaveBeenCalled();
  });

  it('returns isError=true when getMe throws', async () => {
    mockFetchAuthSession.mockResolvedValue(makeSession(true));
    mockGetMe.mockRejectedValue(new Error('API error'));

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current[0]).toBe(false));

    const [isLoading, isError, user] = result.current;
    expect(isLoading).toBe(false);
    expect(isError).toBe(true);
    expect(user).toBeUndefined();
  });

  it('returns isError=true when fetchAuthSession throws', async () => {
    mockFetchAuthSession.mockRejectedValue(new Error('Cognito error'));

    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current[0]).toBe(false));

    const [isLoading, isError, user] = result.current;
    expect(isLoading).toBe(false);
    expect(isError).toBe(true);
    expect(user).toBeUndefined();
  });
});
