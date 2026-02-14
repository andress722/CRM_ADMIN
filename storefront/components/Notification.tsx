// Componente de notificação global (sucesso/erro/status)
import React, { useState, useEffect } from 'react';

export type NotificationType = 'success' | 'error' | 'info';

export default function Notification({ message, type, show, onClose }: {
  message: string;
  type: NotificationType;
  show: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  const color = type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600';

  return (
    <div className={`fixed top-6 right-6 z-50 px-6 py-3 rounded shadow-lg text-white font-bold ${color}`}>
      {message}
    </div>
  );
}
