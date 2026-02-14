"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { endpoints } from '@/services/endpoints';
import { AuthService } from '@/services/auth';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params?.id) ? params?.id[0] : params?.id;
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const token = AuthService.getToken();
    if (!token) {
      setError('Usuário não autenticado.');
      setLoading(false);
      return;
    }
    fetch(endpoints.admin.productDetail(id as string), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        setName(data.name);
        setPrice(data.price);
        setLoading(false);
      })
      .catch(() => {
        setError('Erro ao carregar produto.');
        setLoading(false);
      });
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const token = AuthService.getToken();
    if (!token) {
      setError('Usuário não autenticado.');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(endpoints.admin.productDetail(id as string), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, price: Number(price) }),
      });
      if (!res.ok) throw new Error('Erro ao salvar produto');
      router.push('/products');
    } catch {
      setError('Erro ao salvar produto.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    const token = AuthService.getToken();
    if (!token) {
      setError('Usuário não autenticado.');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(endpoints.admin.productDetail(id as string), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erro ao excluir produto');
      router.push('/products');
    } catch {
      setError('Erro ao excluir produto.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Carregando produto...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="max-w-lg mx-auto p-6 bg-white border rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-4">Editar Produto</h1>
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Nome do produto"
          value={name}
          onChange={e => setName(e.target.value)}
          className="border rounded px-2 py-1"
          required
        />
        <input
          type="number"
          placeholder="Preço"
          value={price}
          onChange={e => setPrice(e.target.value)}
          className="border rounded px-2 py-1"
          required
        />
        {error && <div className="text-red-600">{error}</div>}
        <div className="flex gap-2">
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded font-bold" disabled={loading}>
            Salvar
          </button>
          <button type="button" className="bg-red-600 text-white px-4 py-2 rounded font-bold" onClick={handleDelete} disabled={loading}>
            Excluir
          </button>
        </div>
      </form>
    </div>
  );
}
