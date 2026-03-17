const getCsrfTokenFromCookie = (): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

export const buildAuthHeaders = (headers?: HeadersInit): Headers => {
  const resolved = new Headers(headers);

  const csrf = getCsrfTokenFromCookie();
  if (csrf) {
    resolved.set('X-CSRF-Token', csrf);
  }

  return resolved;
};

export const authFetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  return fetch(input, {
    ...init,
    credentials: init?.credentials ?? 'include',
    headers: buildAuthHeaders(init?.headers),
  });
};
