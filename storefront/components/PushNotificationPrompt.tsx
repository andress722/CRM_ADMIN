import React, { useEffect, useState } from 'react';

export default function PushNotificationPrompt() {
  const [permission, setPermission] = useState<'default' | NotificationPermission>('default');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (typeof Notification === 'undefined') return;
    try {
      setPermission(Notification.permission);
    } catch {
      setPermission('default');
    }
  }, []);

  const requestPermission = async () => {
    if (typeof window === 'undefined') return;
    if (typeof Notification === 'undefined') return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        try {
          new Notification('Notificações ativadas!', { body: 'Você receberá promoções e novidades.' });
        } catch {}
      }
    } catch {}
  };

  if (permission === 'granted') return null;

  return (
    <div className="soft-panel flex flex-col sm:flex-row sm:items-center gap-3">
      <div>
        <p className="text-sm font-semibold text-slate-900">Receba promocoes e novidades</p>
        <p className="text-xs text-slate-500">Alertas de preco, colecoes e ofertas personalizadas.</p>
      </div>
      <button className="btn-primary w-fit" onClick={requestPermission}>
        Ativar notificacoes
      </button>
    </div>
  );
}
