// Painel de notificações internas (alertas)
import React, { useEffect, useState } from 'react';
import { LEGACY_API_URL } from '../lib/legacy-api';

interface Notification {
  id: string;
  type: string; // pagamento, estoque, rma
  message: string;
  status: string; // novo, lido
  createdAt: string;
}

export default function InternalNotificationsPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    fetch(`${LEGACY_API_URL}/notifications`)
      .then((res) => res.json())
      .then((data) => {
        setNotifications(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function markAsRead(id: string) {
    setNotifications(notifications => notifications.map(n => n.id === id ? { ...n, status: 'lido' } : n));
  }

  const filtered = notifications.filter(n => !typeFilter || n.type === typeFilter);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Notificações Internas</h2>
      <div className="mb-4">
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border rounded px-2 py-1">
          <option value="">Todos</option>
          <option value="pagamento">Pagamento</option>
          <option value="estoque">Estoque</option>
          <option value="rma">RMA</option>
        </select>
      </div>
      {loading ? (
        <div>Carregando notificações...</div>
      ) : (
        <table className="min-w-full border text-xs sm:text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">Tipo</th>
              <th className="p-2">Mensagem</th>
              <th className="p-2">Status</th>
              <th className="p-2">Data</th>
              <th className="p-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(n => (
              <tr key={n.id} className={n.status === 'novo' ? 'bg-yellow-100' : ''}>
                <td className="p-2">{n.type}</td>
                <td className="p-2">{n.message}</td>
                <td className="p-2">{n.status}</td>
                <td className="p-2">{n.createdAt}</td>
                <td className="p-2">
                  {n.status === 'novo' && (
                    <button className="bg-blue-600 text-white px-2 py-1 rounded" onClick={() => markAsRead(n.id)}>
                      Marcar como lido
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
