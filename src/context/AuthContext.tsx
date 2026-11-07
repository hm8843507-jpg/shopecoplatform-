import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getCurrentUser, login as loginRequest, register as registerRequest, type AuthUser } from '@/services/api';
import { AuthContext } from '@/context/authContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const expireSession = () => {
      localStorage.removeItem('shop-auth-token');
      setUser(null);
      setError('Your session expired. Please sign in again.');
    };
    window.addEventListener('shop:auth-expired', expireSession);
    if (!localStorage.getItem('shop-auth-token')) {
      setLoading(false);
      return () => {
        active = false;
        window.removeEventListener('shop:auth-expired', expireSession);
      };
    }

    getCurrentUser()
      .then((currentUser) => {
        if (active) setUser(currentUser);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        const status = requestError instanceof Error && 'status' in requestError
          ? Number(requestError.status)
          : undefined;
        if (status === 401 || status === 403 || status === 404) {
          localStorage.removeItem('shop-auth-token');
        } else {
          setError(requestError instanceof Error ? requestError.message : 'Unable to restore your session.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      window.removeEventListener('shop:auth-expired', expireSession);
    };
  }, []);

  const saveSession = useCallback(async (action: () => Promise<{ token: string; user: AuthUser }>) => {
    setError('');
    const session = await action();
    localStorage.setItem('shop-auth-token', session.token);
    setUser(session.user);
  }, []);
  const login = useCallback((email: string, password: string) =>
    saveSession(() => loginRequest(email, password)), [saveSession]);
  const register = useCallback((name: string, email: string, password: string) =>
    saveSession(() => registerRequest(name, email, password)), [saveSession]);
  const logout = useCallback(() => {
    localStorage.removeItem('shop-auth-token');
    setUser(null);
    setError('');
  }, []);

  const value = useMemo(() => ({ user, loading, error, login, register, logout }), [
    user, loading, error, login, register, logout,
  ]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
