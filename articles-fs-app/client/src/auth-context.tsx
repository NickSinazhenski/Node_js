import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { login as apiLogin, register as apiRegister, setUnauthorizedHandler } from './api';

type AuthUser = { id: string; email: string };

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const storageKey = 'authToken';
const userStorageKey = 'authUser';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(storageKey));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem(userStorageKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  const persist = useCallback((nextToken: string, nextUser: AuthUser) => {
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem(storageKey, nextToken);
    localStorage.setItem(userStorageKey, JSON.stringify(nextUser));
  }, []);

  const clear = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(storageKey);
    localStorage.removeItem(userStorageKey);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        const { token: fetchedToken, user: fetchedUser } = await apiLogin({ email, password });
        persist(fetchedToken, fetchedUser);
      } finally {
        setLoading(false);
      }
    },
    [persist],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        const { token: fetchedToken, user: fetchedUser } = await apiRegister({ email, password });
        persist(fetchedToken, fetchedUser);
      } finally {
        setLoading(false);
      }
    },
    [persist],
  );

  useEffect(() => {
    setUnauthorizedHandler(() => clear);
  }, [clear]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      login,
      register,
      logout: clear,
    }),
    [user, token, loading, login, register, clear],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
