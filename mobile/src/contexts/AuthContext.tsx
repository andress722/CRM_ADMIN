import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch, refreshAccessToken } from '../api';
import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from '../storage';

interface AuthContextValue {
  isReady: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const bootstrap = useCallback(async () => {
    const accessToken = await getAccessToken();
    const refreshToken = await getRefreshToken();

    if (!accessToken && !refreshToken) {
      setIsAuthenticated(false);
      setIsReady(true);
      return;
    }

    if (accessToken) {
      setIsAuthenticated(true);
      setIsReady(true);
      return;
    }

    const refreshed = await refreshAccessToken();
    setIsAuthenticated(Boolean(refreshed));
    setIsReady(true);
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await apiFetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        return { ok: false, message: 'Login inválido.' };
      }

      const data = await response.json();
      await saveTokens(data.accessToken, data.refreshToken);
      setIsAuthenticated(true);
      return { ok: true };
    } catch {
      return { ok: false, message: 'Não foi possível autenticar agora.' };
    }
  };

  const signOut = async () => {
    await clearTokens();
    setIsAuthenticated(false);
  };

  const value = useMemo<AuthContextValue>(() => ({ isReady, isAuthenticated, signIn, signOut }), [isReady, isAuthenticated]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
