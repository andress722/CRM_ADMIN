import React, { useEffect, useState } from 'react';
import { useLocale } from '../context/LocaleContext';

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  category?: string;
  rating?: number;
}

export default function RecentlyViewed() {
  const [viewed, setViewed] = useState<Product[]>([]);
  const { formatFromBase } = useLocale();

  useEffect(() => {
    try {
      const stored = localStorage.getItem('recentlyViewed');
      setViewed(stored ? JSON.parse(stored) : []);
    } catch {
      setViewed([]);
    }
  }, []);

  if (!viewed.length) return null;

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <h3 className="text-xl font-bold text-slate-900">Vistos recentemente</h3>
        <span className="chip text-slate-700 bg-slate-100">Seu historico</span>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {viewed.map(product => (
          <div key={product.id} className="min-w-[200px] section-card flex flex-col">
            <img src={product.imageUrl || '/placeholder.png'} alt={product.name} className="w-full h-28 object-cover mb-3 rounded-2xl" />
            <span className="font-semibold text-sm mb-1 text-slate-900">{product.name}</span>
            <span className="text-emerald-600 font-bold text-xs">{formatFromBase(product.price)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
