// components/AdminShell.tsx

'use client';

import React from 'react';

interface AdminShellProps {
  children: React.ReactNode;
}

export default function AdminShell({ children }: AdminShellProps) {
  return (
    <div className="antialiased bg-slate-900 text-slate-50 min-h-screen">
      {children}
    </div>
  );
}
