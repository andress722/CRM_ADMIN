import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './auth';

const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5071';
const API_BASE = RAW_API_URL.replace(/\/+$/, '');
const API_URL = API_BASE.endsWith('/api/v1') ? API_BASE : `${API_BASE}/api/v1`;

type ApiFetchOptions = RequestInit & { skipAuth?: boolean };

export async function apiFetch(path: string, options: ApiFetchOptions = {}) {
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  // Ensure we have a fetch and Headers implementation that works both in browser and SSR.
  let fetchImpl: typeof fetch;
  let HeadersImpl: typeof Headers;
  if (typeof globalThis.fetch === 'function' && typeof globalThis.Headers !== 'undefined') {
    fetchImpl = globalThis.fetch as any;
    HeadersImpl = globalThis.Headers as any;
  } else {
    // We're in a non-browser environment but global fetch isn't available.
    // Load `node-fetch` at runtime using `require` via `eval` to avoid bundlers
    // trying to resolve the module for client bundles.
    if (typeof window !== 'undefined') {
      throw new Error('No global fetch available in this browser environment.');
    }
    try {
      // eslint-disable-next-line no-eval
      const nodeFetch = eval("typeof require !== 'undefined' ? require('node-fetch') : undefined");
      if (!nodeFetch) throw new Error('node-fetch not found');
      fetchImpl = (nodeFetch.default ?? nodeFetch) as any;
      HeadersImpl = (nodeFetch.Headers ?? (nodeFetch as any).Headers) as any;
    } catch (err) {
      throw new Error('No global fetch available. Install `node-fetch` or use Node 18+ which provides global fetch.');
    }
  }
  const headers = new HeadersImpl(options.headers || {});
  if (!options.skipAuth) {
    const token = getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetchImpl(url, { ...options, headers } as any);
  if (response.status !== 401 || options.skipAuth) {
    return response;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearTokens();
    return response;
  }

  const refreshResponse = await fetchImpl(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });

  if (!refreshResponse.ok) {
    clearTokens();
    return response;
  }

  const data = await refreshResponse.json();
  if (!data?.accessToken || !data?.refreshToken) {
    clearTokens();
    return response;
  }

  setTokens(data.accessToken, data.refreshToken);

  const retryHeaders = new Headers(options.headers || {});
  retryHeaders.set('Authorization', `Bearer ${data.accessToken}`);
  return fetchImpl(url, { ...options, headers: retryHeaders } as any);
}
