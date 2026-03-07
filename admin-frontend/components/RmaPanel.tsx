// Painel de RMA/trocas/devolucoes
import { useEffect, useState } from "react";
import { LEGACY_API_URL } from "../lib/legacy-api";

interface RmaRequest {
  id: string;
  orderId: string;
  reason: string;
  status: string;
  createdAt: string;
}

export default function RmaPanel() {
  const [requests, setRequests] = useState<RmaRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    fetch(`${LEGACY_API_URL}/admin/rma`)
      .then((res) => res.json())
      .then((data) => {
        setRequests(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = requests.filter(
    (r) => !statusFilter || r.status === statusFilter,
  );

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">RMA / Trocas / Devolucoes</h2>
      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded px-2 py-1"
        >
          <option value="">Status</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Denied">Denied</option>
          <option value="Completed">Completed</option>
        </select>
      </div>
      {loading ? (
        <div>Carregando solicitacoes...</div>
      ) : (
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">ID</th>
              <th className="p-2">Pedido</th>
              <th className="p-2">Status</th>
              <th className="p-2">Motivo</th>
              <th className="p-2">Data</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="p-2">{r.id}</td>
                <td className="p-2">{r.orderId}</td>
                <td className="p-2">{r.status}</td>
                <td className="p-2">{r.reason}</td>
                <td className="p-2">{r.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
