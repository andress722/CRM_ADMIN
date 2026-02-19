// Painel de conciliação de pagamentos vs pedidos
import React, { useEffect, useState } from 'react';
import { LEGACY_API_URL } from '@/services/endpoints';
import { fetchJson } from '@/services/fetch-client';

interface Reconciliation {
  id: string;
  orderId: string;
  paymentId: string;
  orderAmount: number;
  paymentAmount: number;
  status: string; // Conciliado, Divergente
  createdAt: string;
}

export default function ReconciliationPanel() {
  const [items, setItems] = useState<Reconciliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const data = await fetchJson<Reconciliation[]>(`${LEGACY_API_URL}/reconciliation`);
        if (!mounted) return;
        setItems(data);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = items.filter(i => !statusFilter || i.status === statusFilter);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Conciliação</h2>
      <div className="mb-4">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border rounded px-2 py-1">
          <option value="">Status</option>
          <option value="Conciliado">Conciliado</option>
          <option value="Divergente">Divergente</option>
        </select>
      </div>
      {loading ? (
        <div>Carregando conciliações...</div>
      ) : (
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">ID</th>
              <th className="p-2">Pedido</th>
              <th className="p-2">Pagamento</th>
              <th className="p-2">Valor Pedido</th>
              <th className="p-2">Valor Pago</th>
              <th className="p-2">Status</th>
              <th className="p-2">Data</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(i => (
              <tr key={i.id} className={i.status === 'Divergente' ? 'bg-red-100' : ''}>
                <td className="p-2">{i.id}</td>
                <td className="p-2">{i.orderId}</td>
                <td className="p-2">{i.paymentId}</td>
                <td className="p-2">R$ {i.orderAmount.toFixed(2)}</td>
                <td className="p-2">R$ {i.paymentAmount.toFixed(2)}</td>
                <td className="p-2">{i.status}</td>
                <td className="p-2">{i.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}


