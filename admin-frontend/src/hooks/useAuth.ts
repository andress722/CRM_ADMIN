// src/hooks/useAuth.ts

"use client";

import { AuthService, LoginResult } from "@/services/auth";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type JwtPayload = Record<string, unknown>;

type LoginOptions = {
  captchaToken?: string;
  twoFactorChallengeId?: string;
  twoFactorCode?: string;
};

interface UseAuthReturn {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string, options?: LoginOptions) => Promise<LoginResult>;
  logout: () => void;
  clearError: () => void;
  user: JwtPayload | null;
}

export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<JwtPayload | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const authenticated = AuthService.isAuthenticated();
        setIsAuthenticated(authenticated);

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
    async (email: string, password: string, options?: LoginOptions): Promise<LoginResult> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await AuthService.login({
          email,
          password,
          captchaToken: options?.captchaToken,
          twoFactorChallengeId: options?.twoFactorChallengeId,
          twoFactorCode: options?.twoFactorCode,
        });

        if (result.status === "authenticated") {
          setIsAuthenticated(true);
          const decoded = AuthService.decodeToken();
          setUser(decoded);
          router.push("/admin");
          return result;
        }

        setIsAuthenticated(false);
        setUser(null);

        if (result.status === "requires_two_factor") {
          // 2FA challenge is expected as part of login flow; do not show generic error.
          setError(null);
          return result;
        }

        setError(result.message);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Login failed";
        setError(errorMessage);
        setIsAuthenticated(false);
        setUser(null);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [router],
  );

  const logout = useCallback(() => {
    (async () => {
      try {
        await AuthService.logout();
      } catch {}
      setIsAuthenticated(false);
      setUser(null);
      setError(null);
      router.push("/login");
    })();
  }, [router]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    clearError,
    user,
  };
}

