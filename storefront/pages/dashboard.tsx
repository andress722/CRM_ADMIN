import React, { useEffect, useState } from 'react';
import { useLocale } from '../context/LocaleContext';
import { apiFetch } from '../utils/api';

interface Stats { orders: number; spent: number; favorites: number; reviews: number }

export default function Dashboard() {
  const { formatFromBase } = useLocale();
  const [stats, setStats] = useState<Stats>({ orders: 0, spent: 0, favorites: 0, reviews: 0 });

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await apiFetch('/users/me/stats', { method: 'GET' });
        if (!res.ok) return;
        const data = await res.json();
        if (mounted) setStats(data || { orders: 0, spent: 0, favorites: 0, reviews: 0 });
      } catch (err) {
        console.error('Failed to load dashboard stats', err);
      }
    }
    load();
    return () => { mounted = false };
  }, []);

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard do Usuário</h1>
      <section className="mb-6 grid grid-cols-2 gap-4">
        <div className="bg-blue-100 p-4 rounded shadow text-center">
          <h2 className="text-lg font-semibold mb-2">Pedidos</h2>
          <p className="text-2xl font-bold">{stats.orders}</p>
        </div>
        <div className="bg-green-100 p-4 rounded shadow text-center">
          <h2 className="text-lg font-semibold mb-2">Total gasto</h2>
          <p className="text-2xl font-bold">{formatFromBase(stats.spent)}</p>
        </div>
        <div className="bg-pink-100 p-4 rounded shadow text-center">
          <h2 className="text-lg font-semibold mb-2">Favoritos</h2>
          <p className="text-2xl font-bold">{stats.favorites}</p>
        </div>
        <div className="bg-yellow-100 p-4 rounded shadow text-center">
          <h2 className="text-lg font-semibold mb-2">Avaliações</h2>
          <p className="text-2xl font-bold">{stats.reviews}</p>
        </div>
      </section>
      <section>
        <h2 className="text-lg font-semibold mb-2">Resumo</h2>
        <ul className="list-disc ml-6">
          <li>Último pedido: 2026-01-15</li>
          <li>Produto mais comprado: Produto 1</li>
          <li>Maior valor de pedido: {formatFromBase(320)}</li>
        </ul>
      </section>
    </main>
  );
}
