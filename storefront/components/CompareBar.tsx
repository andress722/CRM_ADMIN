import React, { useState } from 'react';
import ProductCompare from './ProductCompare';

export default function CompareBar({ products, onRemove }: { products: any[]; onRemove: (id: string) => void }) {
  const [show, setShow] = useState(false);
  if (products.length < 2) return null;
  return (
    <div className="fixed bottom-0 left-0 w-full bg-gray-900 text-white p-2 z-50 shadow-lg flex flex-col items-center">
      <div className="flex gap-2 mb-2">
        {products.map(p => (
          <div key={p.id} className="flex items-center gap-1 bg-gray-700 px-2 py-1 rounded">
            <span>{p.name}</span>
            <button className="ml-1 text-red-400" onClick={() => onRemove(p.id)}>✕</button>
          </div>
        ))}
        <button className="ml-4 px-3 py-1 bg-blue-600 rounded" onClick={() => setShow(s => !s)}>
          {show ? 'Fechar comparação' : 'Comparar'}
        </button>
      </div>
      {show && <ProductCompare products={products} />}
    </div>
  );
}
