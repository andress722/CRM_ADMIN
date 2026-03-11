import { useEffect, useMemo, useState } from "react";
import { ADMIN_API_URL } from "../src/services/endpoints";
import OrderDetailsModal from "./OrderDetailsModal";
import OrderExport from "./OrderExport";

type Order = {
  id: string;
  customerName: string;
  status: string;
  createdAt: string;
  totalAmount: number;
};

type OrdersApiResponse = Order[] | { data?: Order[] };

export default function OrderList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${ADMIN_API_URL}/admin/orders`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load orders (${res.status})`);
        return res.json() as Promise<OrdersApiResponse>;
      })
      .then((payload) => {
        const list = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
        setOrders(list);
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      orders.filter(
        (order) =>
          (!statusFilter || order.status === statusFilter) &&
          (!customerFilter || (order.customerName || "").toLowerCase().includes(customerFilter.toLowerCase())) &&
          (!dateFilter || (order.createdAt || "").startsWith(dateFilter)),
      ),
    [orders, statusFilter, customerFilter, dateFilter],
  );

  return (
    <div className="p-4">
      <h2 className="mb-4 text-xl font-bold">Pedidos</h2>
      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border px-2 py-1"
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
          className="rounded border px-2 py-1"
        />
        <input
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          placeholder="Data (YYYY-MM-DD)"
          className="rounded border px-2 py-1"
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
                <th className="whitespace-nowrap p-2">ID</th>
                <th className="whitespace-nowrap p-2">Cliente</th>
                <th className="whitespace-nowrap p-2">Status</th>
                <th className="whitespace-nowrap p-2">Data</th>
                <th className="whitespace-nowrap p-2">Total</th>
                <th className="whitespace-nowrap p-2">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order.id} className="border-b">
                  <td className="whitespace-nowrap p-2">{order.id}</td>
                  <td className="whitespace-nowrap p-2">{order.customerName || "N/A"}</td>
                  <td className="whitespace-nowrap p-2">{order.status}</td>
                  <td className="whitespace-nowrap p-2">{order.createdAt}</td>
                  <td className="whitespace-nowrap p-2">R$ {Number(order.totalAmount || 0).toFixed(2)}</td>
                  <td className="whitespace-nowrap p-2">
                    <button
                      className="rounded bg-gray-200 px-2 py-1"
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
