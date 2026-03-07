// Painel de notificacoes internas (alertas)
import { useEffect, useState } from "react";
import { ADMIN_API_URL } from "../lib/legacy-api";

interface Notification {
  id: string;
  type: string;
  message: string;
  status: string;
  createdAt: string;
}

export default function InternalNotificationsPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    fetch(`${ADMIN_API_URL}/admin/notifications`)
      .then((res) => res.json())
      .then((data) => {
        const mapped = Array.isArray(data)
          ? data.map((n: { id: string; title: string; message: string; date: string; read: boolean }) => ({
              id: n.id,
              type: n.title,
              message: n.message,
              status: n.read ? "lido" : "novo",
              createdAt: n.date,
            }))
          : [];
        setNotifications(mapped);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function markAsRead(id: string) {
    try {
      await fetch(`${ADMIN_API_URL}/admin/notifications/${id}/read`, {
        method: "POST",
      });
    } catch {
      // noop
    }

    setNotifications((current) =>
      current.map((n) => (n.id === id ? { ...n, status: "lido" } : n)),
    );
  }

  const filtered = notifications.filter(
    (n) => !typeFilter || n.type.toLowerCase().includes(typeFilter.toLowerCase()),
  );

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Notificacoes Internas</h2>
      <div className="mb-4">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border rounded px-2 py-1"
        >
          <option value="">Todos</option>
          <option value="pagamento">Pagamento</option>
          <option value="estoque">Estoque</option>
          <option value="rma">RMA</option>
          <option value="falha">Falha</option>
        </select>
      </div>
      {loading ? (
        <div>Carregando notificacoes...</div>
      ) : (
        <table className="min-w-full border text-xs sm:text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">Tipo</th>
              <th className="p-2">Mensagem</th>
              <th className="p-2">Status</th>
              <th className="p-2">Data</th>
              <th className="p-2">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((n) => (
              <tr
                key={n.id}
                className={n.status === "novo" ? "bg-yellow-100" : ""}
              >
                <td className="p-2">{n.type}</td>
                <td className="p-2">{n.message}</td>
                <td className="p-2">{n.status}</td>
                <td className="p-2">{n.createdAt}</td>
                <td className="p-2">
                  {n.status === "novo" && (
                    <button
                      className="bg-blue-600 text-white px-2 py-1 rounded"
                      onClick={() => markAsRead(n.id)}
                    >
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

