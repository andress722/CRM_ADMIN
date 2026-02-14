// src/hooks/useAuth.ts

'use client';

import { AuthService } from '@/services/auth';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

type JwtPayload = Record<string, unknown>;

interface UseAuthReturn {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  user: JwtPayload | null;
}

export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<JwtPayload | null>(null);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = () => {
      try {
        const authenticated = AuthService.isAuthenticated();
        setIsAuthenticated(authenticated);

        // Decode token to get user info
        if (authenticated) {
          const decoded = AuthService.decodeToken();
          setUser(decoded);
        } else {
          setUser(null);
        }
      } catch {
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      setError(null);

      try {
        await AuthService.login(email, password);

        setIsAuthenticated(true);
        const decoded = AuthService.decodeToken();
        setUser(decoded);
        
        // Redirect to admin dashboard
        router.push('/admin');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Login failed';
        setError(errorMessage);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  const logout = useCallback(() => {
    (async () => {
      try {
        await AuthService.logout();
      } catch {}
      setIsAuthenticated(false);
      setUser(null);
      setError(null);
      router.push('/login');
    })();
  }, [router]);

  return {
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    user,
  };
}
