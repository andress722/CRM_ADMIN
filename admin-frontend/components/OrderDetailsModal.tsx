// Modal de detalhes do pedido com historico de status
import { useEffect, useState } from "react";
import { ADMIN_API_URL } from "../src/services/endpoints";

interface StatusHistory {
  status: string;
  date: string;
}

interface Order {
  id: string;
  customerName: string;
  status: string;
  createdAt: string;
  totalAmount: number;
  history: StatusHistory[];
}

export default function OrderDetailsModal({
  orderId,
  onClose,
}: {
  orderId: string;
  onClose: () => void;
}) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${ADMIN_API_URL}/admin/orders/${orderId}`)
      .then((res) => res.json())
      .then((data) => {
        const mapped: Order = {
          id: data?.id,
          customerName: data?.customerName || "",
          status: data?.status || "",
          createdAt: data?.createdAt || "",
          totalAmount: Number(data?.totalAmount || data?.total || 0),
          history: Array.isArray(data?.history) ? data.history : [],
        };
        setOrder(mapped);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [orderId]);

  if (loading) return <div>Carregando...</div>;
  if (!order) return <div>Pedido nao encontrado.</div>;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-lg relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500"
        >
          X
        </button>
        <h2 className="text-xl font-bold mb-2">Pedido {order.id}</h2>
        <p className="mb-1">Cliente: {order.customerName}</p>
        <p className="mb-1">Status atual: {order.status}</p>
        <p className="mb-1">Data: {order.createdAt}</p>
        <p className="mb-4">Total: R$ {order.totalAmount.toFixed(2)}</p>
        <h3 className="font-semibold mb-2">Historico de Status</h3>
        <ul className="mb-4">
          {order.history.length === 0 && (
            <li className="text-sm text-gray-700">Sem historico detalhado.</li>
          )}
          {order.history.map((h, idx) => (
            <li key={idx} className="text-sm text-gray-700">
              {h.status} - {h.date}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

