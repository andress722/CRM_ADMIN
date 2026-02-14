import axios from 'axios';

const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5071';
const API_BASE = RAW_API_URL.replace(/\/+$/, '');
export const API_URL = API_BASE.endsWith('/api/v1') ? API_BASE : `${API_BASE}/api/v1`;

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Attach Authorization header from localStorage when running in browser
if (typeof window !== 'undefined') {
  api.interceptors.request.use((config) => {
    try {
      const token = window.localStorage.getItem('accessToken');
      if (token) {
        config.headers = config.headers ?? {};
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    } catch {
      // ignore
    }
    return config;
  });
}

// Response interceptor to handle 401 -> try refresh token and retry
if (typeof window !== 'undefined') {
  // a separate client without interceptors to call refresh endpoint (send cookies)
  const refreshClient = axios.create({ baseURL: API_URL, headers: { 'Content-Type': 'application/json' }, withCredentials: true });

  let isRefreshing = false;
  let refreshSubscribers: Array<(token: string | null) => void> = [];

  function subscribeTokenRefresh(cb: (token: string | null) => void) {
    refreshSubscribers.push(cb);
  }

  function onRefreshed(token: string | null) {
    refreshSubscribers.forEach(cb => cb(token));
    refreshSubscribers = [];
  }

  api.interceptors.response.use(
    res => res,
    async (error) => {
      const originalRequest = error?.config;
      const status = error?.response?.status;

      if (status === 401 && originalRequest && !originalRequest._retry) {
        originalRequest._retry = true;

        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            subscribeTokenRefresh((token) => {
              if (!token) return reject(error);
              originalRequest.headers = originalRequest.headers || {};
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
              resolve(api(originalRequest));
            });
          });
        }

        isRefreshing = true;

        try {
          // call refresh endpoint without body; server reads HttpOnly cookie
          const resp = await refreshClient.post('/auth/refresh');
          const newToken = resp?.data?.accessToken || resp?.data?.access_token;
          const newRefresh = resp?.data?.refreshToken || resp?.data?.refresh_token;
          if (newToken) {
            window.localStorage.setItem('accessToken', newToken);
            // refresh token is stored as HttpOnly cookie by server; do not store it in localStorage
            if (newRefresh) {
              try {
                // keep for backwards compatibility if server returns it in body; but avoid persisting to localStorage
              } catch {}
            }
            onRefreshed(newToken);
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            return api(originalRequest);
          }
          // refresh didn't return token -> logout
          window.localStorage.removeItem('accessToken');
          window.location.href = '/login';
          onRefreshed(null);
          return Promise.reject(error);
        } catch (refreshErr) {
          window.localStorage.removeItem('accessToken');
          window.location.href = '/login';
          onRefreshed(null);
          return Promise.reject(refreshErr);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    }
  );
}

export default api;
