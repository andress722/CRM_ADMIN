// Listagem de pedidos com filtros avançados
import { useEffect, useState } from "react";
import { ADMIN_API_URL } from "../lib/legacy-api";
import OrderDetailsModal from "./OrderDetailsModal";
import OrderExport from "./OrderExport";

interface Order {
  id: string;
  customerName: string;
  status: string;
  createdAt: string;
  totalAmount: number;
}

export default function OrderList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    fetch(`${ADMIN_API_URL}/admin/orders`)
      .then((res) => res.json())
      .then((data) => {
        setOrders(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = orders.filter(
    (order) =>
      (!statusFilter || order.status === statusFilter) &&
      (!customerFilter ||
        order.customerName
          .toLowerCase()
          .includes(customerFilter.toLowerCase())) &&
      (!dateFilter || order.createdAt.startsWith(dateFilter)),
  );

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Pedidos</h2>
      <div className="flex gap-4 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded px-2 py-1"
        >
          <option value="">Status</option>
          <option value="Pending">Pendente</option>
          <option value="Processing">Processando</option>
          <option value="Shipped">Enviado</option>
          <option value="Delivered">Entregue</option>
          <option value="Cancelled">Cancelado</option>
        </select>
        <input
          value={customerFilter}
          onChange={(e) => setCustomerFilter(e.target.value)}
          placeholder="Cliente"
          className="border rounded px-2 py-1"
        />
        <input
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          placeholder="Data (YYYY-MM-DD)"
          className="border rounded px-2 py-1"
        />
      </div>
      <OrderExport orders={filtered} />
      {loading ? (
        <div>Carregando pedidos...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border text-xs sm:text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 whitespace-nowrap">ID</th>
                <th className="p-2 whitespace-nowrap">Cliente</th>
                <th className="p-2 whitespace-nowrap">Status</th>
                <th className="p-2 whitespace-nowrap">Data</th>
                <th className="p-2 whitespace-nowrap">Total</th>
                <th className="p-2 whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order.id} className="border-b">
                  <td className="p-2 whitespace-nowrap">{order.id}</td>
                  <td className="p-2 whitespace-nowrap">
                    {order.customerName}
                  </td>
                  <td className="p-2 whitespace-nowrap">{order.status}</td>
                  <td className="p-2 whitespace-nowrap">{order.createdAt}</td>
                  <td className="p-2 whitespace-nowrap">
                    R$ {order.totalAmount.toFixed(2)}
                  </td>
                  <td className="p-2 whitespace-nowrap">
                    <button
                      className="bg-gray-200 px-2 py-1 rounded"
                      onClick={() => setSelectedOrderId(order.id)}
                    >
                      Detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selectedOrderId && (
        <OrderDetailsModal
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </div>
  );
}



