'use client';

import { Order, OrderItem } from '@/types/api';
import { X, Clock, AlertCircle, Truck, CheckCircle, XCircle } from 'lucide-react';
import { useState } from 'react';

interface OrderDetailsModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (orderId: string, newStatus: string) => Promise<void>;
}

const STATUS_FLOW = [
  { value: 'Pending', label: 'Pending', icon: Clock, color: 'yellow' },
  { value: 'Processing', label: 'Processing', icon: AlertCircle, color: 'blue' },
  { value: 'Shipped', label: 'Shipped', icon: Truck, color: 'cyan' },
  { value: 'Delivered', label: 'Delivered', icon: CheckCircle, color: 'green' },
];

export function OrderDetailsModal({
  order,
  isOpen,
  onClose,
  onStatusChange,
}: OrderDetailsModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  if (!isOpen || !order) return null;

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

  const calculateItemSubtotal = (item: OrderItem) => {
    return (item.unitPrice * item.quantity).toFixed(2);
  };
  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const formatMoney = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const handlePrint = () => {
    const popup = window.open('', '_blank', 'width=960,height=700');
    if (!popup) return;

    const itemsRows = (order.items || [])
      .map((item) => {
        const sku = escapeHtml(item.productId || 'N/A');
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.unitPrice || 0);
        const subtotal = unitPrice * quantity;

        return `<tr>
          <td>${sku}</td>
          <td>${quantity}</td>
          <td>${formatMoney(unitPrice)}</td>
          <td>${formatMoney(subtotal)}</td>
        </tr>`;
      })
      .join('');

    const orderId = escapeHtml(order.id || 'N/A');
    const customerName = escapeHtml(order.customerName || 'N/A');
    const customerEmail = escapeHtml(order.customerEmail || 'N/A');
    const status = escapeHtml(order.status || 'N/A');
    const createdAt = order.createdAt ? new Date(order.createdAt).toLocaleString('pt-BR') : 'N/A';
    const updatedAt = order.updatedAt ? new Date(order.updatedAt).toLocaleString('pt-BR') : 'N/A';
    const total = formatMoney(Number(order.totalAmount || 0));

    popup.document.write(`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Pedido ${orderId}</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; margin: 24px; color: #0f172a; }
    h1 { margin: 0 0 8px; font-size: 22px; }
    .meta { margin: 0 0 6px; font-size: 13px; color: #334155; }
    .section { margin-top: 18px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 12px; text-align: left; }
    th { background: #f1f5f9; }
    .totals { margin-top: 14px; text-align: right; font-size: 16px; font-weight: 700; }
    @media print {
      body { margin: 10mm; }
    }
  </style>
</head>
<body>
  <h1>Pedido #${orderId}</h1>
  <p class="meta"><strong>Status:</strong> ${status}</p>
  <p class="meta"><strong>Cliente:</strong> ${customerName} (${customerEmail})</p>
  <p class="meta"><strong>Criado em:</strong> ${createdAt}</p>
  <p class="meta"><strong>Atualizado em:</strong> ${updatedAt}</p>

  <div class="section">
    <h2 style="font-size:16px; margin:0;">Itens</h2>
    <table>
      <thead>
        <tr>
          <th>SKU / Produto</th>
          <th>Qtd</th>
          <th>Unitário</th>
          <th>Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows || '<tr><td colspan="4">Nenhum item</td></tr>'}
      </tbody>
    </table>
  </div>

  <div class="totals">Total do pedido: ${total}</div>

  <script>
    window.onload = function () { window.print(); window.close(); };
  </script>
</body>
</html>`);
    popup.document.close();
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-slate-900 rounded-xl shadow-2xl max-w-2xl w-full my-4 sm:my-8 max-h-[calc(100vh-2rem)] overflow-hidden border border-slate-700">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-slate-700 bg-slate-900">
          <div>
            <h2 className="text-2xl font-bold text-white">Order Details</h2>
            <p className="text-slate-400 text-sm">#{order.id?.slice(0, 12) || 'N/A'}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-10rem)]">
          {/* Checklist Completo de Follow Up */}
          <div className="space-y-6">
            {/* 1) Identificação do pedido */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <h3 className="text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wide">Identificação do Pedido</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Order ID:</span>
                  <span className="text-white ml-2">{order.id?.slice(0, 12)}</span>
                </div>
                <div>
                  <span className="text-slate-400">Data/hora:</span>
                  <span className="text-white ml-2">{order.createdAt ? new Date(order.createdAt).toLocaleString() : 'N/A'}</span>
                </div>
                {/* Canal de origem, loja/filial, observações */}
                <div>
                  <span className="text-slate-400">Canal:</span>
                  <span className="text-white ml-2">Site</span>
                </div>
                <div>
                  <span className="text-slate-400">Loja:</span>
                  <span className="text-white ml-2">Principal</span>
                </div>
              </div>
            </div>

            {/* 2) Cliente */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <h3 className="text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wide">Cliente</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Nome:</span>
                  <span className="text-white ml-2">{order.customerName || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Email:</span>
                  <span className="text-white ml-2">{order.customerEmail || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Telefone:</span>
                  <span className="text-white ml-2">(xx) xxxxx-xxxx</span>
                </div>
                <div>
                  <span className="text-slate-400">Endereço:</span>
                  <span className="text-white ml-2">Rua Exemplo, 123</span>
                </div>
              </div>
            </div>

            {/* 3) Itens do pedido */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <h3 className="text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wide">Itens do Pedido</h3>
              <div className="space-y-2">
                {order.items && order.items.length > 0 ? (
                  order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 bg-slate-900/50 rounded-lg border border-slate-700/50">
                      <div>
                        <span className="text-white font-medium">SKU: {item.productId?.slice(0, 8) || 'N/A'}</span>
                        <span className="text-slate-400 ml-2">Qtd: {item.quantity}</span>
                      </div>
                      <div>
                        <span className="text-white font-semibold">R$ {item.unitPrice?.toFixed(2) || '0.00'}</span>
                        <span className="text-blue-400 ml-2">Subtotal: R$ {calculateItemSubtotal(item)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-sm py-2">Nenhum item neste pedido</p>
                )}
              </div>
            </div>

            {/* 4) Pagamento */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <h3 className="text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wide">Pagamento</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Método:</span>
                  <span className="text-white ml-2">Pix</span>
                </div>
                <div>
                  <span className="text-slate-400">Status:</span>
                  <span className="text-white ml-2">Aprovado</span>
                </div>
                <div>
                  <span className="text-slate-400">Valor pago:</span>
                  <span className="text-white ml-2">R$ {order.totalAmount?.toFixed(2) || '0.00'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Parcelas:</span>
                  <span className="text-white ml-2">1x</span>
                </div>
              </div>
            </div>

            {/* 5) Logística / entrega */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <h3 className="text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wide">Logística / Entrega</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Tipo:</span>
                  <span className="text-white ml-2">Motoboy</span>
                </div>
                <div>
                  <span className="text-slate-400">Status:</span>
                  <span className="text-white ml-2">Separando</span>
                </div>
                <div>
                  <span className="text-slate-400">Previsão entrega:</span>
                  <span className="text-white ml-2">Hoje, até 18h</span>
                </div>
                <div>
                  <span className="text-slate-400">Responsável:</span>
                  <span className="text-white ml-2">Fulano</span>
                </div>
              </div>
            </div>

            {/* 6) Status operacional */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <h3 className="text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wide">Status Operacional</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Status atual:</span>
                  <span className="text-white ml-2">{order.status}</span>
                </div>
                <div>
                  <span className="text-slate-400">Motivo pendência:</span>
                  <span className="text-white ml-2">Aguardando pagamento</span>
                </div>
                <div>
                  <span className="text-slate-400">Última atualização:</span>
                  <span className="text-white ml-2">{order.updatedAt ? new Date(order.updatedAt).toLocaleString() : 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Histórico:</span>
                  <span className="text-white ml-2">Pedido criado, pagamento aprovado</span>
                </div>
              </div>
            </div>

            {/* 7) Follow up */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <h3 className="text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wide">Follow Up</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Motivo:</span>
                  <span className="text-white ml-2">Pagamento pendente</span>
                </div>
                <div>
                  <span className="text-slate-400">Próximo contato:</span>
                  <span className="text-white ml-2">Amanhã, 10h</span>
                </div>
                <div>
                  <span className="text-slate-400">Canal:</span>
                  <span className="text-white ml-2">WhatsApp</span>
                </div>
                <div>
                  <span className="text-slate-400">Responsável:</span>
                  <span className="text-white ml-2">Admin</span>
                </div>
              </div>
            </div>

            {/* 8) Evidências */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <h3 className="text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wide">Evidências</h3>
              <div className="text-sm text-white">Nenhuma evidência anexada</div>
            </div>
          </div>

          {/* Status Timeline (mantido) */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wide">Order Status Timeline</h3>
            <div className="flex items-center justify-between gap-2">
              {STATUS_FLOW.map((status, index) => {
                const StatusIcon = status.icon;
                const isCompleted =
                  (order.status === 'Delivered' || order.status === 'Shipped' || order.status === 'Processing' || order.status === 'Pending') &&
                  STATUS_FLOW.findIndex((s) => s.value === order.status) >= index;
                const isCurrent = order.status === status.value;
                const isCancelled = order.status === 'Cancelled';

                return (
                  <div key={status.value} className="flex items-center flex-1">
                    <button
                      onClick={() => !isUpdating && handleStatusChange(status.value)}
                      disabled={isUpdating || isCancelled}
                      className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isCurrent
                          ? `bg-${status.color}-600 text-white ring-2 ring-${status.color}-400 ring-offset-2 ring-offset-slate-900`
                          : isCompleted
                          ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          : 'bg-slate-800 text-slate-500'
                      } ${!isCancelled && !isUpdating ? 'cursor-pointer' : ''}`}
                    >
                      <StatusIcon className="w-5 h-5" />
                    </button>
                    {index < STATUS_FLOW.length - 1 && (
                      <div
                        className={`flex-1 h-1 mx-1 rounded ${
                          isCompleted ? `bg-${status.color}-600` : 'bg-slate-800'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
              <div className="flex-shrink-0">
                <button
                  onClick={() => !isUpdating && handleStatusChange('Cancelled')}
                  disabled={isUpdating || order.status === 'Cancelled'}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    order.status === 'Cancelled'
                      ? 'bg-red-900/80 text-red-300 ring-2 ring-red-400 ring-offset-2 ring-offset-slate-900'
                      : 'bg-slate-800 text-slate-500 hover:bg-red-900/50 hover:text-red-400'
                  } ${!isUpdating ? 'cursor-pointer' : ''}`}
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
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


