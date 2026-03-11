'use client';

import { useState } from 'react';
import { Order, OrderItem } from '@/types/api';
import { X, Clock, AlertCircle, Truck, CheckCircle, XCircle } from 'lucide-react';

interface OrderDetailsModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (orderId: string, newStatus: string) => Promise<void>;
}

type StatusStep = {
  value: 'Pending' | 'Processing' | 'Shipped' | 'Delivered';
  label: string;
  icon: typeof Clock;
  activeClass: string;
  progressClass: string;
};

const STATUS_FLOW: StatusStep[] = [
  { value: 'Pending', label: 'Pending', icon: Clock, activeClass: 'bg-yellow-600 text-white ring-yellow-400', progressClass: 'bg-yellow-600' },
  { value: 'Processing', label: 'Processing', icon: AlertCircle, activeClass: 'bg-blue-600 text-white ring-blue-400', progressClass: 'bg-blue-600' },
  { value: 'Shipped', label: 'Shipped', icon: Truck, activeClass: 'bg-cyan-600 text-white ring-cyan-400', progressClass: 'bg-cyan-600' },
  { value: 'Delivered', label: 'Delivered', icon: CheckCircle, activeClass: 'bg-green-600 text-white ring-green-400', progressClass: 'bg-green-600' },
];

const STATUS_INDEX: Record<Order['status'], number> = {
  Pending: 0,
  Processing: 1,
  Shipped: 2,
  Delivered: 3,
  Cancelled: -1,
};

const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export function OrderDetailsModal({
  order,
  isOpen,
  onClose,
  onStatusChange,
}: OrderDetailsModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  if (!isOpen || !order) return null;

  const currentStatusIndex = STATUS_INDEX[order.status];
  const itemSubtotal = (order.items || []).reduce((sum, item) => sum + (item.unitPrice || 0) * (item.quantity || 0), 0);

  const handleStatusChange = async (newStatus: string) => {
    if (!onStatusChange) return;
    setIsUpdating(true);
    try {
      await onStatusChange(order.id, newStatus);
      onClose();
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePrint = () => {
    const popup = window.open('', '_blank', 'width=960,height=700');
    if (!popup) return;

    const itemsRows = (order.items || [])
      .map((item) => {
        const productId = escapeHtml(item.productId || 'N/A');
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.unitPrice || 0);
        const subtotal = unitPrice * quantity;

        return `<tr>
          <td>${productId}</td>
          <td>${quantity}</td>
          <td>${money(unitPrice)}</td>
          <td>${money(subtotal)}</td>
        </tr>`;
      })
      .join('');

    const orderId = escapeHtml(order.id || 'N/A');
    const customerName = escapeHtml(order.customerName || 'N/A');
    const customerEmail = escapeHtml(order.customerEmail || 'N/A');
    const status = escapeHtml(order.status || 'N/A');
    const createdAt = order.createdAt ? new Date(order.createdAt).toLocaleString('pt-BR') : 'N/A';
    const updatedAt = order.updatedAt ? new Date(order.updatedAt).toLocaleString('pt-BR') : 'N/A';
    const subtotalText = money(itemSubtotal);
    const totalText = money(Number(order.totalAmount || 0));

    popup.document.write(`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Pedido ${orderId}</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; margin: 24px; color: #0f172a; }
    h1 { margin: 0 0 8px; font-size: 22px; }
    h2 { margin: 16px 0 8px; font-size: 16px; }
    .meta { margin: 0 0 6px; font-size: 13px; color: #334155; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 12px; text-align: left; }
    th { background: #f1f5f9; }
    .totals { margin-top: 14px; text-align: right; font-size: 14px; }
    .totals div { margin-top: 6px; }
    .totals .strong { font-size: 16px; font-weight: 700; }
    @media print { body { margin: 10mm; } }
  </style>
</head>
<body>
  <h1>Pedido #${orderId}</h1>
  <p class="meta"><strong>Status:</strong> ${status}</p>
  <p class="meta"><strong>Cliente:</strong> ${customerName} (${customerEmail})</p>
  <p class="meta"><strong>Criado em:</strong> ${createdAt}</p>
  <p class="meta"><strong>Atualizado em:</strong> ${updatedAt}</p>

  <h2>Itens</h2>
  <table>
    <thead>
      <tr>
        <th>Produto / SKU</th>
        <th>Qtd</th>
        <th>Unitário</th>
        <th>Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows || '<tr><td colspan="4">Nenhum item</td></tr>'}
    </tbody>
  </table>

  <div class="totals">
    <div>Subtotal dos itens: ${subtotalText}</div>
    <div class="strong">Total do pedido: ${totalText}</div>
  </div>

  <script>
    window.onload = function () { window.print(); window.close(); };
  </script>
</body>
</html>`);
    popup.document.close();
  };

  const renderItemSubtotal = (item: OrderItem) => money((item.unitPrice || 0) * (item.quantity || 0));

  return (
    <div className={`fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-slate-900 rounded-xl shadow-2xl max-w-3xl w-full my-4 sm:my-8 max-h-[calc(100vh-2rem)] overflow-hidden border border-slate-700">
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-slate-700 bg-slate-900">
          <div>
            <h2 className="text-2xl font-bold text-white">Detalhes do Pedido</h2>
            <p className="text-slate-400 text-sm">#{order.id?.slice(0, 12) || 'N/A'}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-10rem)]">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <h3 className="text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wide">Identificação</h3>
              <p className="text-sm text-slate-400">Status: <span className="text-white">{order.status}</span></p>
              <p className="text-sm text-slate-400">Criado em: <span className="text-white">{order.createdAt ? new Date(order.createdAt).toLocaleString('pt-BR') : 'N/A'}</span></p>
              <p className="text-sm text-slate-400">Atualizado em: <span className="text-white">{order.updatedAt ? new Date(order.updatedAt).toLocaleString('pt-BR') : 'N/A'}</span></p>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <h3 className="text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wide">Cliente</h3>
              <p className="text-sm text-slate-400">Nome: <span className="text-white">{order.customerName || 'N/A'}</span></p>
              <p className="text-sm text-slate-400">Email: <span className="text-white">{order.customerEmail || 'N/A'}</span></p>
              <p className="text-sm text-slate-400">User ID: <span className="text-white">{order.userId || 'N/A'}</span></p>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">Itens do Pedido</h3>
            {order.items && order.items.length > 0 ? (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-400">
                      <th className="border-b border-slate-700 p-2">Produto / SKU</th>
                      <th className="border-b border-slate-700 p-2">Quantidade</th>
                      <th className="border-b border-slate-700 p-2">Unitário</th>
                      <th className="border-b border-slate-700 p-2">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => (
                      <tr key={item.id} className="text-slate-200">
                        <td className="border-b border-slate-800 p-2">{item.productId || 'N/A'}</td>
                        <td className="border-b border-slate-800 p-2">{item.quantity}</td>
                        <td className="border-b border-slate-800 p-2">{money(item.unitPrice || 0)}</td>
                        <td className="border-b border-slate-800 p-2">{renderItemSubtotal(item)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Nenhum item neste pedido.</p>
            )}

            <div className="mt-4 text-right space-y-1">
              <p className="text-sm text-slate-400">Subtotal dos itens: <span className="text-white">{money(itemSubtotal)}</span></p>
              <p className="text-base font-semibold text-white">Total do pedido: {money(order.totalAmount || 0)}</p>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wide">Linha do tempo de status</h3>
            <div className="flex items-center justify-between gap-2">
              {STATUS_FLOW.map((status, index) => {
                const StatusIcon = status.icon;
                const isCompleted = currentStatusIndex >= index;
                const isCurrent = order.status === status.value;
                const isCancelled = order.status === 'Cancelled';

                const stepClasses = isCurrent
                  ? `${status.activeClass} ring-2 ring-offset-2 ring-offset-slate-900`
                  : isCompleted
                  ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                  : 'bg-slate-800 text-slate-500';

                return (
                  <div key={status.value} className="flex items-center flex-1">
                    <button
                      onClick={() => !isUpdating && handleStatusChange(status.value)}
                      disabled={isUpdating || isCancelled}
                      className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${stepClasses}`}
                      title={status.label}
                    >
                      <StatusIcon className="w-5 h-5" />
                    </button>
                    {index < STATUS_FLOW.length - 1 && (
                      <div className={`flex-1 h-1 mx-1 rounded ${isCompleted ? status.progressClass : 'bg-slate-800'}`} />
                    )}
                  </div>
                );
              })}

              <button
                onClick={() => !isUpdating && handleStatusChange('Cancelled')}
                disabled={isUpdating || order.status === 'Cancelled'}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  order.status === 'Cancelled'
                    ? 'bg-red-900/80 text-red-300 ring-2 ring-red-400 ring-offset-2 ring-offset-slate-900'
                    : 'bg-slate-800 text-slate-500 hover:bg-red-900/50 hover:text-red-400'
                }`}
                title="Cancelled"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors font-medium"
            >
              Fechar
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 px-4 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-300 rounded-lg hover:bg-blue-600/30 transition-colors font-medium"
            >
              Imprimir Pedido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
