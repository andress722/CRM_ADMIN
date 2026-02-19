import { AuthService } from './auth';

const getCsrfTokenFromCookie = (): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

const buildHeaders = (headers?: HeadersInit): HeadersInit => {
  const resolved = new Headers(headers);
  const token = AuthService.getToken();
  if (token) {
    resolved.set('Authorization', `Bearer ${token}`);
  }

  const csrf = getCsrfTokenFromCookie();
  if (csrf) {
    resolved.set('X-CSRF-Token', csrf);
  }

  return resolved;
};

export const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    credentials: init?.credentials ?? 'include',
    headers: buildHeaders(init?.headers),
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
};

export const fetchText = async (url: string, init?: RequestInit): Promise<string> => {
  const response = await fetch(url, {
    ...init,
    credentials: init?.credentials ?? 'include',
    headers: buildHeaders(init?.headers),
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.text();
};
