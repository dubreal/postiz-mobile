import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, setOrgApiKey, UnauthorizedError } from '@/lib/api';
import type { SelfUser } from '@/lib/types';

type Status = 'loading' | 'authed' | 'anon';

interface AuthState {
  status: Status;
  user: SelfUser | null;
  login: (form: HTMLFormElement) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<SelfUser | null>(null);

  const refresh = useCallback(async () => {
    try {
      const self = await api.get<SelfUser>('/api/user/self');
      setOrgApiKey(self.publicApi); // needed for public-API calls (calendar, channels)
      setUser(self);
      setStatus('authed');
    } catch (e) {
      setUser(null);
      setStatus('anon');
      if (!(e instanceof UnauthorizedError)) {
        // Network or server error: still treat as anon, but surface nothing secret.
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // The password is read straight from the form's uncontrolled inputs at submit
  // time, placed into the request body, and never stored in React state, a ref,
  // a log, or anywhere else. This is the closest a client can get to not
  // "handling" the secret while still authenticating the user.
  const login = useCallback(
    async (form: HTMLFormElement) => {
      const data = new FormData(form);
      const email = String(data.get('email') ?? '').trim();
      await api.post('/api/auth/login', {
        email,
        password: String(data.get('password') ?? ''),
        provider: 'LOCAL',
      });
      await refresh();
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/api/user/logout');
    } catch {
      /* clearing the cookie is best-effort */
    }
    setOrgApiKey('');
    setUser(null);
    setStatus('anon');
  }, []);

  const value = useMemo<AuthState>(
    () => ({ status, user, login, logout, refresh }),
    [status, user, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
