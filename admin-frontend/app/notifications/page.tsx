"use client";
import React, { useEffect, useState } from 'react';
import { endpoints } from '@/services/endpoints';
import { AuthService } from '@/services/auth';

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  date: string;
  read?: boolean;
};

const normalizeNotification = (payload: NotificationItem | (NotificationItem & { id: string | number })) => ({
  ...payload,
  id: String(payload.id),
});

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState<string | null>(null);

  useEffect(() => {
    const token = AuthService.getToken();
    if (!token) {
      setError('Usuário não autenticado.');
      setLoading(false);
      return;
    }
    // Fallback: carrega notificações iniciais
    fetch(endpoints.admin.notifications, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setNotifications(data.map((item) => normalizeNotification(item)));
        } else {
          setNotifications([]);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Erro ao carregar notificações.');
        setLoading(false);
      });

    // WebSocket para tempo real
    const wsUrl = endpoints.admin.notifications.replace(/^http/, 'ws') + '/ws';
    const ws = new WebSocket(wsUrl + `?token=${token}`);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (Array.isArray(data)) {
          setNotifications(data.map((item) => normalizeNotification(item)));
        } else if (data && data.id) {
          const normalized = normalizeNotification(data);
          setNotifications((prev) => {
            const exists = prev.find((n) => n.id === normalized.id);
            if (exists) {
              return prev.map((n) => (n.id === normalized.id ? normalized : n));
            }
            return [normalized, ...prev];
          });
        }
      } catch {}
    };
    ws.onerror = () => setError('Erro na conexão em tempo real.');
    ws.onclose = () => {};
    return () => ws.close();
  }, []);

  const markAsRead = async (id: string) => {
    setMarking(id);
    const token = AuthService.getToken();
    try {
      await fetch(`${endpoints.admin.notifications}/${id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((notifications) =>
        notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {
      setError('Erro ao marcar como lida.');
    } finally {
      setMarking(null);
    }
  };

  if (loading) return <div>Carregando notificações...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!notifications.length) return <div>Nenhuma notificação encontrada.</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white border rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-4">Notificações Administrativas</h1>
      <ul className="space-y-4">
        {notifications.map(n => (
          <li key={n.id} className={`p-4 border rounded-lg ${n.read ? 'bg-gray-100' : 'bg-blue-50'}`}>
            <div className="flex justify-between items-center">
              <div>
                <div className="font-semibold text-blue-900">{n.title}</div>
                <div className="text-sm text-gray-700">{n.message}</div>
                <div className="text-xs text-gray-400 mt-1">{new Date(n.date).toLocaleString()}</div>
              </div>
              {!n.read && (
                <button
                  className="ml-4 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  onClick={() => markAsRead(n.id)}
                  disabled={marking === n.id}
                >
                  {marking === n.id ? 'Marcando...' : 'Marcar como lida'}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
