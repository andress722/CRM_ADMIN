// Painel de RMA/trocas/devoluções
import { useEffect, useState } from "react";
import { API_URL } from "../src/services/endpoints";

interface RmaRequest {
  id: string;
  orderId: string;
  productId: string;
  customerName: string;
  type: string; // Troca ou Devolução
  status: string;
  reason: string;
  evidenceUrl?: string;
  createdAt: string;
}

export default function RmaPanel() {
  const [requests, setRequests] = useState<RmaRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/rma`)
      .then((res) => res.json())
      .then((data) => {
        setRequests(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = requests.filter(
    (r) => !statusFilter || r.status === statusFilter,
  );

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">RMA / Trocas / Devoluções</h2>
      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded px-2 py-1"
        >
          <option value="">Status</option>
          <option value="Pendente">Pendente</option>
          <option value="Aprovado">Aprovado</option>
          <option value="Recusado">Recusado</option>
          <option value="Finalizado">Finalizado</option>
        </select>
      </div>
      {loading ? (
        <div>Carregando solicitações...</div>
      ) : (
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">ID</th>
              <th className="p-2">Pedido</th>
              <th className="p-2">Produto</th>
              <th className="p-2">Cliente</th>
              <th className="p-2">Tipo</th>
              <th className="p-2">Status</th>
              <th className="p-2">Motivo</th>
              <th className="p-2">Evidência</th>
              <th className="p-2">Data</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="p-2">{r.id}</td>
                <td className="p-2">{r.orderId}</td>
                <td className="p-2">{r.productId}</td>
                <td className="p-2">{r.customerName}</td>
                <td className="p-2">{r.type}</td>
                <td className="p-2">{r.status}</td>
                <td className="p-2">{r.reason}</td>
                <td className="p-2">
                  {r.evidenceUrl ? (
                    <a
                      href={r.evidenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Ver
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="p-2">{r.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
