// src/services/auth.ts

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

export const AuthService = {
  /**
   * Login user with email and password
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await ApiClient.post<LoginResponse>(
        endpoints.auth.login,
        { email, password },
        { withCredentials: true },
      );

      if (response.accessToken) {
        AuthService.setToken(response.accessToken);
      }
      // server sets refresh token as HttpOnly cookie; do NOT persist refresh token in localStorage

      // persist user role/email for quick UI checks
      try {
        if (typeof window !== "undefined" && response.user) {
          if (response.user.role)
            window.localStorage.setItem(USER_ROLE_KEY, response.user.role);
          if (response.user.email)
            window.localStorage.setItem(USER_EMAIL_KEY, response.user.email);
        }
      } catch {}

      return response;
    } catch {
      throw new Error("Failed to login. Please check your credentials.");
    }
  },

  /**
   * Logout user and clear tokens
   */
  async logout(): Promise<void> {
    try {
      // call server to revoke refresh cookie/token
      await ApiClient.post(endpoints.auth.logout, undefined, {
        withCredentials: true,
      }).catch(() => {});
    } catch {}

    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
      // refresh token stored as HttpOnly cookie on server
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
    // refresh token is not stored in localStorage when using HttpOnly cookie
    return null;
  },

  /**
   * Set refresh token
   */
  setRefreshToken(_token: string): void {
    void _token;
    // No-op: refresh is stored as HttpOnly cookie by server
  },

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(): Promise<string | null> {
    try {
      // Call refresh endpoint without body; server reads refresh token from HttpOnly cookie
      const response = await ApiClient.post<LoginResponse>(
        endpoints.auth.refresh,
        undefined,
        { withCredentials: true },
      );

      if (response.accessToken) {
        AuthService.setToken(response.accessToken);
        // server rotates refresh cookie; do not persist refresh token in localStorage
        // update stored user info if present
        try {
          if (typeof window !== "undefined" && response.user) {
            if (response.user.role)
              window.localStorage.setItem(USER_ROLE_KEY, response.user.role);
            if (response.user.email)
              window.localStorage.setItem(USER_EMAIL_KEY, response.user.email);
          }
        } catch {}
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

      const expirationTime = decoded.exp * 1000; // Convert to milliseconds
      return Date.now() >= expirationTime;
    } catch {
      return true;
    }
  },
};
