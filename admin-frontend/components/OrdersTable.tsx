'use client';

import React, { useState } from 'react';
import { Order } from '@/lib/types';
import { ChevronDown, ChevronUp, Eye, Trash2 } from 'lucide-react';

interface OrdersTableProps {
  orders: Order[];
  onView: (order: Order) => void;
  onDelete: (id: string) => void;
}

type OrderItem = {
  id: string;
  quantity: number;
  unitPrice: number;
};

export function OrdersTable({ orders, onView, onDelete }: OrdersTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusGradient = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'from-yellow-500 to-yellow-600';
      case 'processing':
        return 'from-blue-500 to-blue-600';
      case 'shipped':
        return 'from-purple-500 to-purple-600';
      case 'delivered':
        return 'from-emerald-500 to-emerald-600';
      case 'cancelled':
        return 'from-red-500 to-red-600';
      default:
        return 'from-slate-500 to-slate-600';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      pending: '⏱️ Pendente',
      processing: '⚙️ Processando',
      shipped: '📦 Enviado',
      delivered: '✅ Entregue',
      cancelled: '❌ Cancelado',
    };
    return labels[status.toLowerCase()] || status;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-4xl font-bold gradient-text mb-2">Pedidos Recentes</h2>
        <p className="text-slate-400">Histórico completo de transações</p>
      </div>

      <div className="glass rounded-2xl border border-slate-600 overflow-hidden">
        {orders.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-400 text-lg">Nenhum pedido encontrado</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-600">
            {orders.map((order) => (
              <div key={order.id} className="hover:bg-slate-700/20 transition-colors">
                <div className="p-6 flex items-center justify-between cursor-pointer">
                  <div
                    className="flex-1"
                    onClick={() =>
                      setExpandedId(expandedId === order.id ? null : order.id)
                    }
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="text-slate-400 text-sm">#</span>
                          <span className="font-bold text-lg text-slate-200 font-mono">
                            {order.id.substring(0, 8)}
                          </span>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${getStatusGradient(
                              order.status
                            )}`}
                          >
                            {getStatusLabel(order.status)}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-slate-500">Cliente</p>
                            <p className="text-slate-200 font-medium">{order.userId}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Total</p>
                            <p className="text-emerald-400 font-bold">
                              {formatCurrency(order.totalAmount)}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Data</p>
                            <p className="text-slate-300 text-xs">
                              {formatDate(order.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onView(order);
                      }}
                      className="p-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg transition-all hover:scale-110"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(order.id);
                      }}
                      className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-all hover:scale-110"
                    >
                      <Trash2 size={18} />
                    </button>
                    <button
                      onClick={() =>
                        setExpandedId(expandedId === order.id ? null : order.id)
                      }
                      className="p-2 text-slate-400 hover:text-slate-300"
                    >
                      {expandedId === order.id ? (
                        <ChevronUp size={20} />
                      ) : (
                        <ChevronDown size={20} />
                      )}
                    </button>
                  </div>
                </div>

                {expandedId === order.id && (
                  <div className="px-6 py-4 bg-slate-700/10 border-t border-slate-600 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="glass rounded-lg p-4 border border-slate-600">
                        <p className="text-slate-500 text-sm mb-2">Informações do Pedido</p>
                        <div className="space-y-2 text-sm">
                          <p>
                            <span className="text-slate-400">ID:</span>
                            <span className="text-slate-200 ml-2 font-mono">{order.id}</span>
                          </p>
                          <p>
                            <span className="text-slate-400">Status:</span>
                            <span className="text-slate-200 ml-2">
                              {getStatusLabel(order.status)}
                            </span>
                          </p>
                          <p>
                            <span className="text-slate-400">Itens:</span>
                            <span className="text-slate-200 ml-2">
                              {order.items?.length || 0}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="glass rounded-lg p-4 border border-slate-600">
                        <p className="text-slate-500 text-sm mb-2">Resumo Financeiro</p>
                        <div className="space-y-2 text-sm">
                          <p>
                            <span className="text-slate-400">Subtotal:</span>
                            <span className="text-slate-200 ml-2">
                              {formatCurrency(order.totalAmount)}
                            </span>
                          </p>
                          <p>
                            <span className="text-slate-400">Total:</span>
                            <span className="text-emerald-400 ml-2 font-bold">
                              {formatCurrency(order.totalAmount)}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {order.items && order.items.length > 0 && (
                      <div className="glass rounded-lg p-4 border border-slate-600">
                        <p className="text-slate-500 text-sm mb-4">Itens do Pedido</p>
                        <div className="space-y-3">
                          {order.items?.map((item: OrderItem, idx: number) => (
                            <div
                              key={idx}
                              className="flex justify-between items-center p-2 bg-slate-700/20 rounded border border-slate-600"
                            >
                              <span className="text-slate-300 text-sm">
                                Produto #{idx + 1}
                              </span>
                              <div className="text-right">
                                <p className="text-slate-200 text-sm font-medium">
                                  Qtd: {item.quantity}
                                </p>
                                <p className="text-emerald-400 text-sm">
                                  {formatCurrency(item.unitPrice * item.quantity)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
