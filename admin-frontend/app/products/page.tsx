"use client";

import React, { useEffect, useState } from 'react';
import { endpoints } from '@/services/endpoints';
import { AuthService } from '@/services/auth';
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
    fetch(endpoints.admin.products, {
      headers: { Authorization: `Bearer ${token}` },
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

  if (loading) return <div>Carregando produtos...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!products.length) return <div>Nenhum produto encontrado.</div>;

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
