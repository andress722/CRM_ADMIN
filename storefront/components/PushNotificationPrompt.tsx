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
    <div className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 flex flex-col items-center">
      <span className="mb-2 font-bold">Receba promoções e novidades!</span>
      <button
        className="bg-white text-blue-600 px-4 py-2 rounded font-bold"
        onClick={requestPermission}
      >
        Ativar notificações
      </button>
    </div>
  );
}
