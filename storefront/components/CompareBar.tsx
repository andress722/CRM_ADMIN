import React, { useState } from 'react';
import ProductCompare from './ProductCompare';

export default function CompareBar({ products, onRemove }: { products: any[]; onRemove: (id: string) => void }) {
  const [show, setShow] = useState(false);
  if (products.length < 2) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[min(960px,92vw)] bg-slate-900 text-white p-3 z-50 shadow-glow rounded-2xl">
      <div className="flex flex-wrap items-center gap-2">
        {products.map(p => (
          <div key={p.id} className="flex items-center gap-1 bg-slate-700/70 px-3 py-1 rounded-full">
            <span className="text-xs font-semibold">{p.name}</span>
            <button className="ml-1 text-rose-300" onClick={() => onRemove(p.id)}>✕</button>
          </div>
        ))}
        <button className="ml-auto btn-primary" onClick={() => setShow(s => !s)}>
          {show ? 'Fechar comparação' : 'Comparar'}
        </button>
      </div>
      {show && (
        <div className="mt-3 bg-white text-slate-900 rounded-xl p-3">
          <ProductCompare products={products} />
        </div>
      )}
    </div>
  );
}
