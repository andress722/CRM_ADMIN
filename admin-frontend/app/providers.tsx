// app/providers.tsx

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '@/contexts/ToastContext';
import { ToastContainer } from '@/components/ToastContainer';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { ReactNode } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <NotificationProvider>
          {children}
          <ToastContainer />
        </NotificationProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
