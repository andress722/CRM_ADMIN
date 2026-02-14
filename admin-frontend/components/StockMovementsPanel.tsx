// Painel de movimentações de estoque
import React, { useEffect, useState } from 'react';
import { API_URL } from '@/services/endpoints';

interface Movement {
  id: string;
  productId: string;
  type: string; // Entrada, Saída, Ajuste
  quantity: number;
  warehouse: string;
  reason: string;
  createdAt: string;
}

export default function StockMovementsPanel() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/movements`)
      .then((res) => res.json())
      .then((data) => {
        setMovements(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = movements.filter(m => !typeFilter || m.type === typeFilter);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Movimentações de Estoque</h2>
      <div className="mb-4">
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border rounded px-2 py-1">
          <option value="">Tipo</option>
          <option value="Entrada">Entrada</option>
          <option value="Saída">Saída</option>
          <option value="Ajuste">Ajuste</option>
        </select>
      </div>
      {loading ? (
        <div>Carregando movimentações...</div>
      ) : (
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">ID</th>
              <th className="p-2">Produto</th>
              <th className="p-2">Tipo</th>
              <th className="p-2">Quantidade</th>
              <th className="p-2">Depósito</th>
              <th className="p-2">Motivo</th>
              <th className="p-2">Data</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => (
              <tr key={m.id} className="border-b">
                <td className="p-2">{m.id}</td>
                <td className="p-2">{m.productId}</td>
                <td className="p-2">{m.type}</td>
                <td className="p-2">{m.quantity}</td>
                <td className="p-2">{m.warehouse}</td>
                <td className="p-2">{m.reason}</td>
                <td className="p-2">{m.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
