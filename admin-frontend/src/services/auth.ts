// src/services/auth.ts

import { AxiosError } from "axios";
import { LoginResponse } from "@/types/api";
import ApiClient from "./api-client";
import { endpoints } from "./endpoints";

const TOKEN_KEY = "accessToken";
const USER_ROLE_KEY = "userRole";
const USER_EMAIL_KEY = "userEmail";

type JwtPayload = {
  exp?: number;
  [key: string]: unknown;
};

type LoginPayload = {
  email: string;
  password: string;
  captchaToken?: string;
  twoFactorChallengeId?: string;
  twoFactorCode?: string;
};

type TwoFactorChallengeResponse = {
  message?: string;
  requiresTwoFactor?: boolean;
  requiresTwoFactorSetup?: boolean;
  challengeId?: string;
};

export type LoginResult =
  | { status: "authenticated"; data: LoginResponse }
  | { status: "requires_two_factor"; challengeId: string; message: string }
  | { status: "requires_two_factor_setup"; message: string };

const decodeBase64 = (value: string): string | null => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

  if (typeof atob === "function") {
    try {
      const decoded = atob(padded);
      return decodeURIComponent(
        decoded
          .split("")
          .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`)
          .join(""),
      );
    } catch {
      return null;
    }
  }

  const buffer = (
    globalThis as {
      Buffer?: {
        from: (
          input: string,
          encoding: string,
        ) => { toString: (encoding: string) => string };
      };
    }
  ).Buffer;
  if (buffer) {
    try {
      return buffer.from(padded, "base64").toString("utf-8");
    } catch {
      return null;
    }
  }

  return null;
};

const persistUserInfo = (response: LoginResponse) => {
  try {
    if (typeof window !== "undefined" && response.user) {
      if (response.user.role) {
        window.localStorage.setItem(USER_ROLE_KEY, response.user.role);
      }
      if (response.user.email) {
        window.localStorage.setItem(USER_EMAIL_KEY, response.user.email);
      }
    }
  } catch {}
};

const mapAuthError = (error: unknown): string => {
  if (error instanceof AxiosError) {
    const message =
      (error.response?.data as { message?: string } | undefined)?.message ||
      error.message;
    return message || "Failed to login. Please check your credentials.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Failed to login. Please check your credentials.";
};

export const AuthService = {
  /**
   * Login user with email and password
   */
  async login(payload: LoginPayload): Promise<LoginResult> {
    try {
      const response = await ApiClient.post<LoginResponse>(
        endpoints.auth.login,
        payload,
        { withCredentials: true },
      );

      if (!response.accessToken) {
        throw new Error("Invalid login response.");
      }

      AuthService.setToken(response.accessToken);
      persistUserInfo(response);

      return {
        status: "authenticated",
        data: response,
      };
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 428) {
        const challenge = error.response.data as TwoFactorChallengeResponse;
        const message = challenge?.message || "2FA required";

        if (challenge?.requiresTwoFactorSetup) {
          return {
            status: "requires_two_factor_setup",
            message,
          };
        }

        if (challenge?.requiresTwoFactor && challenge?.challengeId) {
          return {
            status: "requires_two_factor",
            challengeId: challenge.challengeId,
            message,
          };
        }
      }

      throw new Error(mapAuthError(error));
    }
  },

  /**
   * Logout user and clear tokens
   */
  async logout(): Promise<void> {
    try {
      await ApiClient.post(endpoints.auth.logout, undefined, {
        withCredentials: true,
      }).catch(() => {});
    } catch {}

    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_ROLE_KEY);
      localStorage.removeItem(USER_EMAIL_KEY);
    }
  },

  /**
   * Get stored access token
   */
  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
  },

  /**
   * Set access token
   */
  setToken(token: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(TOKEN_KEY, token);
    }
  },

  /**
   * Get stored refresh token
   */
  getRefreshToken(): string | null {
    return null;
  },

  /**
   * Set refresh token
   */
  setRefreshToken(_token: string): void {
    void _token;
  },

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(): Promise<string | null> {
    try {
      const response = await ApiClient.post<LoginResponse>(
        endpoints.auth.refresh,
        undefined,
        { withCredentials: true },
      );

      if (response.accessToken) {
        AuthService.setToken(response.accessToken);
        persistUserInfo(response);
        return response.accessToken;
      }

      return null;
    } catch {
      AuthService.logout();
      return null;
    }
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = AuthService.getToken();
    return !!token;
  },

  /**
   * Decode JWT token to get payload (without verification)
   * Note: This is NOT secure - only use for reading non-sensitive data from client
   */
  decodeToken(token?: string): JwtPayload | null {
    try {
      const t = token || AuthService.getToken();
      if (!t) return null;

      const parts = t.split(".");
      if (parts.length !== 3) return null;

      const decoded = decodeBase64(parts[1]);
      if (!decoded) return null;

      return JSON.parse(decoded) as JwtPayload;
    } catch {
      return null;
    }
  },

  /**
   * Check if token is expired
   */
  isTokenExpired(token?: string): boolean {
    try {
      const decoded = AuthService.decodeToken(token);
      if (!decoded || !decoded.exp) return true;

      const expirationTime = decoded.exp * 1000;
      return Date.now() >= expirationTime;
    } catch {
      return true;
    }
  },
};
