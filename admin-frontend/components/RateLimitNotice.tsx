// Mensagem de rate limiting/anti-bot
import React from 'react';

export default function RateLimitNotice({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="fixed bottom-4 right-4 bg-yellow-200 border border-yellow-400 text-yellow-900 px-4 py-2 rounded shadow-lg z-50">
      <strong>Limite de requisições atingido.</strong> Aguarde alguns instantes antes de tentar novamente.
    </div>
  );
}
