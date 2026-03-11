import { useEffect, useState } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import apiClient from '@api/apiClient';
import { User } from '@api/dtos/user.dto';

export function useAuth(): [boolean, boolean, User | undefined] {
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [user, setUser] = useState<User | undefined>(undefined);

  useEffect(() => {
    const loadUser = async () => {
      // ─── DEV ONLY ─ remove before shipping ───────────────────────────────────────
      if (import.meta.env.VITE_DEV_AUTH_BYPASS === 'true') {
        try {
          const me = await apiClient.getMe();
          setUser(me);
        } catch {
          // no dev user selected — stay as logged out
        } finally {
          setIsLoading(false);
        }
        return;
      }
      // ─────────────────────────────────────────────────────────────────────────────
      try {
        const session = await fetchAuthSession();
        if (!session.tokens?.idToken) {
          setIsLoading(false);
          return;
        }

        const me = await apiClient.getMe();
        setUser(me);
      } catch {
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  return [isLoading, isError, user];
}
