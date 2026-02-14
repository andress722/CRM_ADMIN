// app/admin/layout.tsx

'use client';

import AdminShell from '@/components/AdminShell';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 mb-4">
            <span className="text-xl font-bold text-white animate-spin">⚙️</span>
          </div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AdminShell>
      <div className="flex h-screen overflow-hidden bg-slate-900">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <Header />

          {/* Content Area */}
          <main className="flex-1 overflow-auto">
            <div className="p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </AdminShell>
  );
}
