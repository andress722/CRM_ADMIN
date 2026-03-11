import React from 'react';

type OrderExportItem = {
  id: string;
  status: string;
  createdAt: string;
  totalAmount: number;
  customerName?: string;
  userId?: string;
};

const csvEscape = (value: unknown): string => {
  const raw = String(value ?? '');
  const normalized = raw.replace(/\r?\n/g, ' ').trim();
  const escaped = normalized.replace(/"/g, '""');
  return `"${escaped}"`;
};

export default function OrderExport({ orders }: { orders: OrderExportItem[] }) {
  function exportCSV() {
    const header = ['ID', 'Cliente', 'Status', 'Data', 'Total'];
    const rows = orders.map((order) => [
      order.id,
      order.customerName || order.userId || 'N/A',
      order.status,
      order.createdAt,
      Number(order.totalAmount || 0).toFixed(2),
    ]);

    const csvLines = [header, ...rows].map((r) => r.map(csvEscape).join(','));
    const csv = `\uFEFF${csvLines.join('\n')}`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateTag = new Date().toISOString().slice(0, 10);
    a.download = `pedidos-${dateTag}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button onClick={exportCSV} className="mb-4 rounded bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700">
      Exportar CSV
    </button>
  );
}
