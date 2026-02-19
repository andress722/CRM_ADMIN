// Painel de carrinho abandonado
import React, { useEffect, useState } from 'react';
import { LEGACY_API_URL } from '@/services/endpoints';
import { fetchJson } from '@/services/fetch-client';

interface AbandonedCart {
  id: string;
  customerName: string;
  email: string;
  items: { productId: string; name: string; quantity: number }[];
  lastUpdated: string;
  recoveryStatus: string;
}

export default function AbandonedCartPanel() {
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const data = await fetchJson<AbandonedCart[]>(`${LEGACY_API_URL}/abandoned-carts`);
        if (!mounted) return;
        setCarts(data);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = carts.filter(c => !statusFilter || c.recoveryStatus === statusFilter);

  function sendRecoveryEmail(cart: AbandonedCart) {
    // Simula envio de e-mail/WhatsApp
    alert(`Recuperação enviada para ${cart.email}`);
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Carrinhos Abandonados</h2>
      <div className="mb-4">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border rounded px-2 py-1">
          <option value="">Status</option>
          <option value="Pendente">Pendente</option>
          <option value="Recuperado">Recuperado</option>
        </select>
      </div>
      {loading ? (
        <div>Carregando carrinhos...</div>
      ) : (
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">Cliente</th>
              <th className="p-2">E-mail</th>
              <th className="p-2">Itens</th>
              <th className="p-2">Última atualização</th>
              <th className="p-2">Status</th>
              <th className="p-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="border-b">
                <td className="p-2">{c.customerName}</td>
                <td className="p-2">{c.email}</td>
                <td className="p-2">{c.items.map(i => `${i.name} x${i.quantity}`).join(', ')}</td>
                <td className="p-2">{c.lastUpdated}</td>
                <td className="p-2">{c.recoveryStatus}</td>
                <td className="p-2">
                  <button className="bg-green-600 text-white px-2 py-1 rounded" onClick={() => sendRecoveryEmail(c)}>
                    Enviar recuperação
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}


