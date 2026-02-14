'use client';

import React from 'react';
import { useToast, Toast } from '@/contexts/ToastContext';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

const toastIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const toastColors = {
  success: 'bg-green-900/80 border-green-700 text-green-100',
  error: 'bg-red-900/80 border-red-700 text-red-100',
  warning: 'bg-yellow-900/80 border-yellow-700 text-yellow-100',
  info: 'bg-blue-900/80 border-blue-700 text-blue-100',
};

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onClose: () => void;
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  const Icon = toastIcons[toast.type];
  const colorClass = toastColors[toast.type];

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-300 ${colorClass}`}
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium">{toast.message}</p>
      </div>
      <button
        onClick={onClose}
        className="ml-2 flex-shrink-0 p-1 hover:bg-white/20 rounded transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
