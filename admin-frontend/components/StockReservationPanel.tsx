// Painel de reserva de estoque
import React, { useEffect, useState } from 'react';
import { API_URL } from '@/services/endpoints';

interface Reservation {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  status: string;
  createdAt: string;
}

export default function StockReservationPanel() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/reservations`)
      .then((res) => res.json())
      .then((data) => {
        setReservations(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = reservations.filter(r => !statusFilter || r.status === statusFilter);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Reservas de Estoque</h2>
      <div className="mb-4">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border rounded px-2 py-1">
          <option value="">Status</option>
          <option value="Reservado">Reservado</option>
          <option value="Liberado">Liberado</option>
          <option value="Cancelado">Cancelado</option>
        </select>
      </div>
      {loading ? (
        <div>Carregando reservas...</div>
      ) : (
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">ID</th>
              <th className="p-2">Pedido</th>
              <th className="p-2">Produto</th>
              <th className="p-2">Quantidade</th>
              <th className="p-2">Status</th>
              <th className="p-2">Data</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-b">
                <td className="p-2">{r.id}</td>
                <td className="p-2">{r.orderId}</td>
                <td className="p-2">{r.productId}</td>
                <td className="p-2">{r.quantity}</td>
                <td className="p-2">{r.status}</td>
                <td className="p-2">{r.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
