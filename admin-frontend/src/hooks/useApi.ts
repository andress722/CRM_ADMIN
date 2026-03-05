// src/hooks/useApi.ts

import { ApiClient } from '@/services/api-client';
import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { AxiosError, AxiosProgressEvent } from 'axios';

/**
 * Generic hook for GET requests
 */
export function useApiQuery<T>(
  queryKey: (string | number | undefined)[],
  url: string,
  options?: Omit<UseQueryOptions<T, AxiosError>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKey.filter(Boolean),
    queryFn: () => ApiClient.get<T>(url),
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}

/**
 * Generic hook for POST/PUT/DELETE requests
 */
export function useApiMutation<TData, TRequest = unknown>(
  method: 'post' | 'put' | 'patch' | 'delete',
  options?: UseMutationOptions<TData, AxiosError, { url: string; data?: TRequest }>
) {
  return useMutation<TData, AxiosError, { url: string; data?: TRequest }>({
    mutationFn: ({ url, data }: { url: string; data?: TRequest }) => {
      switch (method) {
        case 'post':
          return ApiClient.post<TData>(url, data);
        case 'put':
          return ApiClient.put<TData>(url, data);
        case 'patch':
          return ApiClient.patch<TData>(url, data);
        case 'delete':
          return ApiClient.delete<TData>(url);
        default:
          throw new Error(`Unsupported method: ${method}`);
      }
    },
    ...options,
  });
}

/**
 * Generic hook for file uploads
 */
type UploadPayload = {
  url: string;
  formData: FormData;
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
};

export function useApiUpload<T = unknown>(
  options?: UseMutationOptions<T, AxiosError, UploadPayload>
) {
  return useMutation<T, AxiosError, UploadPayload>({
    mutationFn: async ({ url, formData, onUploadProgress }) =>
      ApiClient.uploadFile<T>(url, formData, onUploadProgress),
    ...options,
  });
}

