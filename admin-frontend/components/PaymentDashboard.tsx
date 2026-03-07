// Dashboard de pagamentos e conciliação
import { useEffect, useState } from "react";
import { ADMIN_API_URL } from "../lib/legacy-api";

interface Payment {
  id: string;
  orderId: string;
  method: string;
  status: string;
  amount: number;
  createdAt: string;
  webhookStatus: string;
}

export default function PaymentDashboard() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    fetch(`${ADMIN_API_URL}/admin/payments`)
      .then((res) => res.json())
      .then((data) => {
        setPayments(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = payments.filter(
    (p) => !statusFilter || p.status === statusFilter,
  );

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Pagamentos</h2>
      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded px-2 py-1"
        >
          <option value="">Status</option>
          <option value="Pending">Pendente</option>
          <option value="Approved">Aprovado</option>
          <option value="Failed">Falhou</option>
          <option value="Refunded">Estornado</option>
        </select>
      </div>
      {loading ? (
        <div>Carregando pagamentos...</div>
      ) : (
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">ID</th>
              <th className="p-2">Pedido</th>
              <th className="p-2">Método</th>
              <th className="p-2">Status</th>
              <th className="p-2">Valor</th>
              <th className="p-2">Data</th>
              <th className="p-2">Webhook</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="p-2">{p.id}</td>
                <td className="p-2">{p.orderId}</td>
                <td className="p-2">{p.method}</td>
                <td className="p-2">{p.status}</td>
                <td className="p-2">R$ {p.amount.toFixed(2)}</td>
                <td className="p-2">{p.createdAt}</td>
                <td className="p-2">{p.webhookStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}



