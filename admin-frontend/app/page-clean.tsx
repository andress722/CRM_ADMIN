'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated) {
      router.push('/admin');
    } else {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 mb-4">
          <span className="text-xl font-bold text-white animate-spin">⚙️</span>
        </div>
        <p className="text-slate-400">Redirecting...</p>
      </div>
    </div>
  );
}
