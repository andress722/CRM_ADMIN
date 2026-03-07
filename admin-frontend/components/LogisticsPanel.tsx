// Painel de logistica: entregas, cotacao de frete, status
import { useEffect, useState } from "react";
import { LEGACY_API_URL } from "../lib/legacy-api";

interface Delivery {
  id: string;
  orderId: string;
  type: string;
  status: string;
  estimatedDate: string;
  trackingCode?: string;
  freightCost: number;
}

export default function LogisticsPanel() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    fetch(`${LEGACY_API_URL}/admin/logistics`)
      .then((res) => res.json())
      .then((data) => {
        const mapped = Array.isArray(data)
          ? data.map((d: { id: string; orderId: string; service: string; status: string; updatedAt?: string; createdAt: string; trackingNumber?: string }) => ({
              id: d.id,
              orderId: d.orderId,
              type: d.service || "Padrao",
              status: d.status,
              estimatedDate: d.updatedAt || d.createdAt,
              trackingCode: d.trackingNumber,
              freightCost: 0,
            }))
          : [];
        setDeliveries(mapped);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = deliveries.filter(
    (d) => !statusFilter || d.status === statusFilter,
  );

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Logistica</h2>
      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded px-2 py-1"
        >
          <option value="">Status</option>
          <option value="Created">Created</option>
          <option value="Shipped">Shipped</option>
          <option value="Delivered">Delivered</option>
        </select>
      </div>
      {loading ? (
        <div>Carregando entregas...</div>
      ) : (
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">ID</th>
              <th className="p-2">Pedido</th>
              <th className="p-2">Tipo</th>
              <th className="p-2">Status</th>
              <th className="p-2">Atualizado</th>
              <th className="p-2">Frete</th>
              <th className="p-2">Rastreamento</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id} className="border-b">
                <td className="p-2">{d.id}</td>
                <td className="p-2">{d.orderId}</td>
                <td className="p-2">{d.type}</td>
                <td className="p-2">{d.status}</td>
                <td className="p-2">{d.estimatedDate}</td>
                <td className="p-2">R$ {d.freightCost.toFixed(2)}</td>
                <td className="p-2">{d.trackingCode || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
