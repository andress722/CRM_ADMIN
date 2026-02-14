import React, { useEffect, useState } from 'react';
import { useLocale } from '../context/LocaleContext';
import { apiFetch } from '../utils/api';

interface ProductSummary { id: string; name: string; price: number; imageUrl?: string }

export default function Recommendations() {
  const { formatFromBase } = useLocale();
  const [products, setProducts] = useState<ProductSummary[]>([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await apiFetch('/recommendations', { method: 'GET' });
        if (!res.ok) return;
        const data = await res.json();
        if (mounted) setProducts(data || []);
      } catch (err) {
        console.error('Failed to load recommendations', err);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold mb-4">Recomendações para você</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {products.map(product => (
          <div key={product.id} className="border rounded-xl p-3 bg-white shadow flex flex-col items-center">
            <img src={product.imageUrl || '/placeholder.png'} alt={product.name} className="w-full h-32 object-cover mb-2 rounded-lg" />
            <h3 className="text-base font-bold mb-1">{product.name}</h3>
            <p className="text-blue-600 font-semibold mb-2">{formatFromBase(product.price)}</p>
            <button className="bg-green-600 text-white px-4 py-2 rounded font-bold mt-auto">Adicionar ao Carrinho</button>
          </div>
        ))}
      </div>
    </section>
  );
}
