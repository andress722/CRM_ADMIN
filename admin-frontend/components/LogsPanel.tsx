// Painel de logs estruturados
import { useEffect, useState } from "react";
import { ADMIN_API_URL } from "../src/services/endpoints";

interface Log {
  id: string;
  type: string;
  message: string;
  user?: string;
  timestamp: string;
}

export default function LogsPanel() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    fetch(`${ADMIN_API_URL}/admin/logs`)
      .then((res) => res.json())
      .then((data) => {
        const mapped = Array.isArray(data)
          ? data.map((l: { id: string; action: string; details: string; userEmail?: string; date: string }) => ({
              id: l.id,
              type: l.action,
              message: l.details,
              user: l.userEmail,
              timestamp: l.date,
            }))
          : [];

        setLogs(mapped);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = logs.filter((l) => !typeFilter || l.type === typeFilter);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Logs Estruturados</h2>
      <div className="mb-4">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border rounded px-2 py-1"
        >
          <option value="">Todos</option>
          <option value="Read">Read</option>
          <option value="Email">Email</option>
        </select>
      </div>
      {loading ? (
        <div>Carregando logs...</div>
      ) : (
        <table className="min-w-full border text-xs sm:text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">Tipo</th>
              <th className="p-2">Mensagem</th>
              <th className="p-2">Usuario</th>
              <th className="p-2">Data</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id} className="border-b">
                <td className="p-2">{l.type}</td>
                <td className="p-2">{l.message}</td>
                <td className="p-2">{l.user || "-"}</td>
                <td className="p-2">{l.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

