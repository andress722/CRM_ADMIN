"use client";

import { AuthService } from "@/services/auth";
import { endpoints } from "@/services/endpoints";
import Link from "next/link";
import { useEffect, useState } from "react";

type OrderSummary = {
  id: string;
  customerName?: string;
  customerEmail?: string;
  total?: number;
  status?: string;
};

export default function OrdersPage() {
  const token = AuthService.getToken();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(() => Boolean(token));
  const [error, setError] = useState<string | null>(() =>
    token ? null : "Usuário não autenticado.",
  );

  useEffect(() => {
    if (!token) return;
    fetch(endpoints.admin.orders, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setOrders(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Erro ao carregar pedidos.");
        setLoading(false);
      });
  }, [token]);

  if (loading) return <div>Carregando pedidos...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!orders.length) return <div>Nenhum pedido encontrado.</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white border rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-4">Pedidos</h1>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">ID</th>
            <th className="p-2 border">Cliente</th>
            <th className="p-2 border">Valor</th>
            <th className="p-2 border">Status</th>
            <th className="p-2 border">Detalhes</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td className="p-2 border">{order.id}</td>
              <td className="p-2 border">
                {order.customerName || order.customerEmail}
              </td>
              <td className="p-2 border">R$ {order.total?.toFixed(2)}</td>
              <td className="p-2 border">{order.status}</td>
              <td className="p-2 border">
                <Link
                  href={`/orders/${order.id}`}
                  className="text-blue-600 underline"
                >
                  Ver
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
