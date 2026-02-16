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
    <section>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h2 className="section-title">Recomendacoes para voce</h2>
          <p className="section-lead">Produtos que combinam com seu estilo e ultima busca.</p>
        </div>
        <span className="badge-muted">Atualizado agora</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {products.map(product => (
          <div key={product.id} className="product-card flex flex-col">
            <img src={product.imageUrl || '/placeholder.png'} alt={product.name} className="w-full h-36 object-cover mb-3 rounded-2xl" />
            <h3 className="text-lg font-bold mb-1 text-slate-900">{product.name}</h3>
            <p className="price-tag mb-3">{formatFromBase(product.price)}</p>
            <button className="btn-primary mt-auto">Adicionar ao Carrinho</button>
          </div>
        ))}
      </div>
    </section>
  );
}
