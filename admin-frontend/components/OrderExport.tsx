// Exportação de pedidos para CSV
import React from 'react';

type OrderExportItem = {
  id: string;
  status: string;
  createdAt: string;
  totalAmount: number;
  customerName?: string;
  userId?: string;
};

export default function OrderExport({ orders }: { orders: OrderExportItem[] }) {
  function exportCSV() {
    const header = ['ID', 'Cliente', 'Status', 'Data', 'Total'];
    const rows = orders.map((order) => [
      order.id,
      order.customerName || order.userId || 'N/A',
      order.status,
      order.createdAt,
      order.totalAmount,
    ]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pedidos.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button onClick={exportCSV} className="bg-blue-600 text-white px-4 py-2 rounded font-bold mb-4">Exportar CSV</button>
  );
}
