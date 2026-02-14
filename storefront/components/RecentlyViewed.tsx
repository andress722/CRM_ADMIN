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
    <div className="my-6">
      <h3 className="text-lg font-bold mb-2">Produtos vistos recentemente</h3>
      <div className="flex gap-4 overflow-x-auto">
        {viewed.map(product => (
          <div key={product.id} className="min-w-[180px] border rounded-lg p-2 bg-white shadow flex flex-col items-center">
            <img src={product.imageUrl || '/placeholder.png'} alt={product.name} className="w-24 h-24 object-cover mb-2 rounded" />
            <span className="font-semibold text-sm mb-1">{product.name}</span>
            <span className="text-blue-600 font-bold text-xs">{formatFromBase(product.price)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
