import React, { useState } from 'react';

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  category?: string;
  rating?: number;
  [key: string]: any;
}

export default function ProductCompare({ products }: { products: Product[] }) {
  if (products.length < 2) return null;
  const keys = Object.keys(products[0]).filter(k => k !== 'id' && k !== 'imageUrl');
  return (
    <div className="overflow-x-auto my-6">
      <table className="min-w-full border rounded-lg bg-white">
        <thead>
          <tr>
            <th className="p-2 border">Atributo</th>
            {products.map(p => (
              <th key={p.id} className="p-2 border">{p.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {keys.map(key => (
            <tr key={key}>
              <td className="p-2 border font-bold">{key}</td>
              {products.map(p => (
                <td key={p.id + key} className="p-2 border">{p[key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
