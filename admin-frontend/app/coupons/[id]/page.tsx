"use client";
import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { endpoints } from '@/services/endpoints';
import { AuthService } from '@/services/auth';

export default function EditCouponPage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params?.id) ? params?.id[0] : params?.id;
  const [code, setCode] = useState('');
  const [discount, setDiscount] = useState('');
  const [active, setActive] = useState(true);
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
    fetch(endpoints.admin.couponDetail(id as string), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        setCode(data.code);
        setDiscount(data.discount);
        setActive(data.active);
        setLoading(false);
      })
      .catch(() => {
        setError('Erro ao carregar cupom.');
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
      const res = await fetch(endpoints.admin.couponDetail(id as string), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code, discount: Number(discount), active }),
      });
      if (!res.ok) throw new Error('Erro ao salvar cupom');
      router.push('/coupons');
    } catch {
      setError('Erro ao salvar cupom.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Carregando cupom...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="max-w-lg mx-auto p-6 bg-white border rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-4">Editar Cupom</h1>
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Código do cupom"
          value={code}
          onChange={e => setCode(e.target.value)}
          className="border rounded px-2 py-1"
          required
        />
        <input
          type="number"
          placeholder="Desconto (%)"
          value={discount}
          onChange={e => setDiscount(e.target.value)}
          className="border rounded px-2 py-1"
          required
        />
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
          Ativo
        </label>
        {error && <div className="text-red-600">{error}</div>}
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded font-bold" disabled={loading}>
          Salvar
        </button>
      </form>
    </div>
  );
}
