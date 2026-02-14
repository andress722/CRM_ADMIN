// Página de rastreamento de pedidos
import React, { useEffect, useState } from 'react';
import SeoHead from '../components/SeoHead';
import { useRouter } from 'next/router';
import { apiFetch } from '../utils/api';

interface Order {
  id: string;
  status: string;
  carrier?: string;
  updated?: string;
  history?: Array<{ date: string; status: string }>;
  items?: Array<{ id: string; name: string; qty: number }>;
  estimatedDelivery?: string;
}

export default function TrackOrder() {
  const router = useRouter();
  const { id } = router.query as { id?: string };

  const [orderId, setOrderId] = useState<string>(id ? String(id) : '');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setOrderId(String(id));
    fetchOrder(String(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function fetchOrder(targetId: string) {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(`/orders/${targetId}`, { method: 'GET', skipAuth: true });
      if (!res.ok) {
        setOrder(null);
        setError('Pedido não encontrado.');
        return;
      }
      const data = await res.json();
      setOrder(data as Order);
    } catch (err) {
      console.error('Failed to load order', err);
      setError('Erro ao buscar pedido.');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!orderId) return;
    await fetchOrder(orderId);
  }

  return (
    <>
      <SeoHead title="Rastreamento de Pedido | Loja Online" description="Acompanhe o status do seu pedido." />
      <div className="max-w-md mx-auto p-6 mt-8 border rounded bg-white shadow">
        <h2 className="text-xl font-bold mb-4 text-center">Rastreamento de Pedido</h2>
        <form onSubmit={handleSearch} className="mb-4">
          <label htmlFor="orderId" className="block mb-2 font-medium">Informe o número do pedido:</label>
          <input
            id="orderId"
            type="text"
            value={orderId}
            onChange={e => setOrderId(e.target.value)}
            className="w-full border rounded px-2 py-1 mb-2"
            required
          />
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded font-bold w-full">Buscar</button>
        </form>

        {loading && <p>Carregando pedido...</p>}
        {error && <div className="text-red-600 mb-2">{error}</div>}

        {order && (
          <div className="border rounded p-4 bg-gray-50">
            <div className="mb-2 font-semibold">Status: <span className="text-blue-600">{order.status}</span></div>
            {order.carrier && <div className="mb-2">Transportadora: {order.carrier}</div>}
            {order.updated && <div className="mb-2">Última atualização: {order.updated}</div>}
            {order.history && (
              <>
                <h4 className="font-bold mt-4 mb-2">Histórico</h4>
                <ul>
                  {order.history.map((h, idx) => (
                    <li key={idx} className="text-sm mb-1">{h.date}: {h.status}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
