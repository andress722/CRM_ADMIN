// Painel de etiquetas, packing list e picking list
import React, { useEffect, useState } from 'react';

interface Packing {
  id: string;
  orderId: string;
  items: { productId: string; name: string; quantity: number }[];
  status: string;
  createdAt: string;
}

export default function PackingPanel() {
  const [packings, setPackings] = useState<Packing[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetch('http://localhost:5000/api/packing')
      .then((res) => res.json())
      .then((data) => {
        setPackings(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = packings.filter(p => !statusFilter || p.status === statusFilter);

  function printPacking() {
    // Simula impressão
    window.print();
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Etiquetas / Packing List / Picking List</h2>
      <div className="mb-4">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border rounded px-2 py-1">
          <option value="">Status</option>
          <option value="Pendente">Pendente</option>
          <option value="Pronto">Pronto</option>
          <option value="Enviado">Enviado</option>
        </select>
      </div>
      {loading ? (
        <div>Carregando listas...</div>
      ) : (
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">ID</th>
              <th className="p-2">Pedido</th>
              <th className="p-2">Itens</th>
              <th className="p-2">Status</th>
              <th className="p-2">Data</th>
              <th className="p-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id} className="border-b">
                <td className="p-2">{p.id}</td>
                <td className="p-2">{p.orderId}</td>
                <td className="p-2">
                  {p.items.map(i => `${i.name} x${i.quantity}`).join(', ')}
                </td>
                <td className="p-2">{p.status}</td>
                <td className="p-2">{p.createdAt}</td>
                <td className="p-2">
                  <button className="bg-blue-600 text-white px-2 py-1 rounded" onClick={() => printPacking()}>Imprimir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
