"use client";

import React, { useState, useEffect } from 'react';

import { LoadingState, ErrorState, EmptyState } from '@/components/ui/AsyncState';
import { endpoints } from '@/services/endpoints';
import { AuthService } from '@/services/auth';
import { authFetch } from '@/services/auth-fetch';
import Link from 'next/link';

type ProductSummary = {
  id: string;
  name: string;
  price?: number;
};

export default function ProductsPage() {
  const token = AuthService.getToken();
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(() => Boolean(token));
  const [error, setError] = useState<string | null>(() => (token ? null : 'Usuário não autenticado.'));

  useEffect(() => {
    if (!token) return;
    authFetch(endpoints.admin.products, {
      headers: {},
    })
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Erro ao carregar produtos.');
        setLoading(false);
      });
  }, [token]);

  if (loading) return <LoadingState message="Carregando produtos..." />;
  if (error) return <ErrorState message={error} />;
  if (!products.length) return <EmptyState message="Nenhum produto encontrado." />;

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white border rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-4">Produtos</h1>
      <Link href="/products/new" className="bg-blue-600 text-white px-4 py-2 rounded font-bold mb-4 inline-block">Novo Produto</Link>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">ID</th>
            <th className="p-2 border">Nome</th>
            <th className="p-2 border">Preço</th>
            <th className="p-2 border">Ações</th>
          </tr>
        </thead>
        <tbody>
          {products.map(product => (
            <tr key={product.id}>
              <td className="p-2 border">{product.id}</td>
              <td className="p-2 border">{product.name}</td>
              <td className="p-2 border">R$ {product.price?.toFixed(2)}</td>
              <td className="p-2 border">
                <Link href={`/products/${product.id}`} className="text-blue-600 underline mr-2">Editar</Link>
                <Link href={`/products/${product.id}/images`} className="text-green-600 underline">Imagens</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}









