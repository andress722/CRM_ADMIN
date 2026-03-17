import axios, {
  AxiosInstance,
  AxiosProgressEvent,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";
import { AuthService } from "./auth";

const API_TIMEOUT = parseInt(
  process.env.NEXT_PUBLIC_API_TIMEOUT || "30000",
  10,
);
const API_ROOT = "";

const AUTH_ENDPOINT_MARKERS = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email",
  "/auth/resend-verification",
  "/auth/social/",
];

const isAuthEndpoint = (url?: string): boolean => {
  if (!url) return false;
  return AUTH_ENDPOINT_MARKERS.some((marker) => url.includes(marker));
};

const getCookieValue = (name: string): string | null => {
  if (typeof document === "undefined") return null;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
};
// Create axios instance
export const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_ROOT,
  timeout: API_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
});

// Flag to prevent infinite refresh token loops
let isRefreshing = false;
let failedQueue: (() => void)[] = [];

const processQueue = () => {
  failedQueue.forEach((callback) => callback());
  failedQueue = [];
};

// Request interceptor: session is handled by BFF cookies.
axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const method = (config.method || "get").toLowerCase();
    const isStateChangingMethod = ["post", "put", "patch", "delete"].includes(method);
    const isAuthSessionEndpoint =
      !!config.url &&
      (config.url.includes("/auth/refresh") || config.url.includes("/auth/logout"));

    if (isStateChangingMethod && isAuthSessionEndpoint) {
      const csrfToken = getCookieValue("csrf_token");
      if (csrfToken) {
        config.headers["X-CSRF-Token"] = csrfToken;
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: Handle 401 and token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthEndpoint(originalRequest.url)
    ) {
      if (isRefreshing) {
        // Queue the request while token is being refreshed
        return new Promise((resolve) => {
          failedQueue.push(() => {
            resolve(axiosInstance(originalRequest));
          });
        });
      }

      isRefreshing = true;
      originalRequest._retry = true;

      try {
        // Attempt to refresh token
        const newToken = await AuthService.refreshToken();

        if (newToken) {
          processQueue();
          isRefreshing = false;
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed - clear auth and redirect to login
        AuthService.logout();
        isRefreshing = false;
        failedQueue = [];

        // Only redirect in browser environment
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

// API Client with type-safe methods
export const ApiClient = {
  get: <T = unknown>(url: string, config?: AxiosRequestConfig) =>
    axiosInstance.get<T>(url, config).then((res) => res.data),

  post: <T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ) => axiosInstance.post<T>(url, data, config).then((res) => res.data),

  put: <T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ) => axiosInstance.put<T>(url, data, config).then((res) => res.data),

  patch: <T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ) => axiosInstance.patch<T>(url, data, config).then((res) => res.data),

  delete: <T = unknown>(url: string, config?: AxiosRequestConfig) =>
    axiosInstance.delete<T>(url, config).then((res) => res.data),

  // File upload with progress
  uploadFile: <T = unknown>(
    url: string,
    formData: FormData,
    onUploadProgress?: (progressEvent: AxiosProgressEvent) => void,
  ) =>
    axiosInstance
      .post<T>(url, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress,
      })
      .then((res) => res.data),
};

export default ApiClient;




