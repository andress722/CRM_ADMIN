// Painel de logística: entregas, cotação de frete, status
import React, { useEffect, useState } from 'react';

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
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetch('http://localhost:5000/api/deliveries')
      .then((res) => res.json())
      .then((data) => {
        setDeliveries(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = deliveries.filter(d => !statusFilter || d.status === statusFilter);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Logística</h2>
      <div className="mb-4">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border rounded px-2 py-1">
          <option value="">Status</option>
          <option value="Separando">Separando</option>
          <option value="Enviado">Enviado</option>
          <option value="Entregue">Entregue</option>
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
              <th className="p-2">Previsão</th>
              <th className="p-2">Frete</th>
              <th className="p-2">Rastreamento</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(d => (
              <tr key={d.id} className="border-b">
                <td className="p-2">{d.id}</td>
                <td className="p-2">{d.orderId}</td>
                <td className="p-2">{d.type}</td>
                <td className="p-2">{d.status}</td>
                <td className="p-2">{d.estimatedDate}</td>
                <td className="p-2">R$ {d.freightCost.toFixed(2)}</td>
                <td className="p-2">{d.trackingCode || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
