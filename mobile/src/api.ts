import Constants from 'expo-constants';
import { clearTokens, getAccessToken, getRefreshToken, saveProductsCache, getProductsCache, saveTokens } from './storage';

const DEFAULT_API_URL = 'http://localhost:5071/api/v1';

export function getApiUrl() {
  const extra = Constants.expoConfig?.extra as Record<string, string> | undefined;
  const raw = (extra?.API_URL || DEFAULT_API_URL).replace(/\/+$/, '');
  return raw.endsWith('/api/v1') ? raw : `${raw}/api/v1`;
}

export async function apiFetch(path: string, options: RequestInit = {}, retry = true) {
  const url = path.startsWith('http') ? path : `${getApiUrl()}${path}`;
  const headers = new Headers(options.headers || {});
  const token = await getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(url, { ...options, headers });
  if (response.status !== 401 || !retry) return response;

  const refreshed = await refreshAccessToken();
  if (!refreshed) return response;

  const retryHeaders = new Headers(options.headers || {});
  retryHeaders.set('Authorization', `Bearer ${refreshed}`);
  return fetch(url, { ...options, headers: retryHeaders });
}

export async function refreshAccessToken() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${getApiUrl()}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    if (!response.ok) {
      await clearTokens();
      return null;
    }

    const data = await response.json();
    await saveTokens(data.accessToken, data.refreshToken ?? refreshToken);
    return data.accessToken as string;
  } catch {
    return null;
  }
}

export async function registerPushDevice(payload: { token: string; platform: string; deviceName?: string }) {
  const response = await apiFetch('/push/devices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return response.ok;
}

export interface ProductListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export async function fetchProducts<T>(query = ''): Promise<{ data: ProductListResponse<T> | null; offline: boolean; }> {
  const params = new URLSearchParams();
  if (query.trim()) params.set('query', query.trim());
  params.set('page', '1');
  params.set('pageSize', '20');

  try {
    const response = await apiFetch(`/products/search?${params.toString()}`);
    if (!response.ok) throw new Error('Failed');
    const data = (await response.json()) as ProductListResponse<T>;
    await saveProductsCache(data);
    return { data, offline: false };
  } catch {
    const cached = await getProductsCache<ProductListResponse<T>>();
    return { data: cached, offline: true };
  }
}
