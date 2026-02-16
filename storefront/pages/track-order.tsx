// Página de rastreamento de pedidos
import React, { useEffect, useState } from 'react';
import SeoHead from '../components/SeoHead';
import { useRouter } from 'next/router';
import { apiFetch } from '../utils/api';
import StorefrontHeader from '../components/StorefrontHeader';
import StorefrontFooter from '../components/StorefrontFooter';

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
      <SeoHead title="Rastreamento de Pedido | InfoTechGamer" description="Acompanhe o status do seu pedido." />
      <main className="page-shell">
        <StorefrontHeader />
        <section className="section-card max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">InfoTechGamer Care</p>
            <h2 className="text-2xl font-bold">Rastreamento de pedido</h2>
            <p className="text-sm text-slate-600">Informe o numero do pedido para acompanhar atualizacoes em tempo real.</p>
          </div>
          <form onSubmit={handleSearch} className="mb-4">
            <label htmlFor="orderId" className="block mb-2 font-medium text-slate-700">Numero do pedido</label>
            <input
              id="orderId"
              type="text"
              value={orderId}
              onChange={e => setOrderId(e.target.value)}
              className="input-field w-full mb-3"
              required
            />
            <button type="submit" className="btn-primary w-full">Buscar</button>
          </form>

          {loading && <p className="text-sm text-slate-600">Carregando pedido...</p>}
          {error && <div className="text-rose-600 mb-2 text-sm">{error}</div>}

          {order && (
            <div className="soft-panel">
              <div className="mb-2 font-semibold">Status: <span className="text-amber-700">{order.status}</span></div>
              {order.carrier && <div className="mb-2 text-sm">Transportadora: {order.carrier}</div>}
              {order.updated && <div className="mb-2 text-sm">Ultima atualizacao: {order.updated}</div>}
              {order.history && (
                <>
                  <h4 className="font-bold mt-4 mb-2">Historico</h4>
                  <ul>
                    {order.history.map((h, idx) => (
                      <li key={idx} className="text-sm mb-1">{h.date}: {h.status}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </section>
        <StorefrontFooter />
      </main>
    </>
  );
}
