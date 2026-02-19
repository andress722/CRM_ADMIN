"use client";

import React, { useState, useEffect } from 'react';

import { LoadingState, ErrorState, EmptyState } from '@/components/ui/AsyncState';
import { useParams } from 'next/navigation';
import { endpoints } from '@/services/endpoints';
import { AuthService } from '@/services/auth';
import { authFetch } from '@/services/auth-fetch';

type OrderItem = {
  id: string;
  name: string;
  quantity: number;
  price?: number;
};

type OrderDetail = {
  id: string;
  customerName?: string;
  customerEmail?: string;
  total?: number;
  status?: string;
  items?: OrderItem[];
};

export default function OrderDetailPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params?.id[0] : params?.id;
  const token = AuthService.getToken();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(() => Boolean(token && id));
  const [error, setError] = useState<string | null>(() => (token ? null : 'Usuário não autenticado.'));

  useEffect(() => {
    if (!id || !token) return;
    authFetch(endpoints.admin.orderDetail(id as string), {
      headers: {},
    })
      .then(res => res.json())
      .then(data => {
        setOrder(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Erro ao carregar pedido.');
        setLoading(false);
      });
  }, [id, token]);

  if (loading) return <LoadingState message="Carregando pedido..." />;
  if (error) return <ErrorState message={error} />;
  if (!order) return <EmptyState message="Nenhum dado de pedido." />;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white border rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-4">Pedido #{order.id}</h1>
      <div className="mb-2"><strong>Cliente:</strong> {order.customerName || order.customerEmail}</div>
      <div className="mb-2"><strong>Valor total:</strong> R$ {order.total?.toFixed(2)}</div>
      <div className="mb-2"><strong>Status:</strong> {order.status}</div>
      {/* Adicione mais detalhes conforme necessário */}
      <h2 className="text-lg font-bold mt-4 mb-2">Itens</h2>
      <ul className="list-disc pl-6">
        {order.items?.map((item) => (
          <li key={item.id}>
            {item.name} - {item.quantity}x - R$ {item.price?.toFixed(2)}
          </li>
        ))}
      </ul>
    </div>
  );
}








