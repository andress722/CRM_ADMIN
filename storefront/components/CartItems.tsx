// Componente de exibição dos itens do carrinho
import React from 'react';
import { useCart } from '../context/CartContext';
import { useLocale } from '../context/LocaleContext';

export default function CartItems() {
  const { items, updateQuantity, removeItem } = useCart();
  const { formatFromBase } = useLocale();

  if (items.length === 0) return <div>Carrinho vazio.</div>;

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.id + (item.color || '') + (item.size || '')} className="flex items-center border rounded p-2 bg-white shadow">
          <img src={item.imageUrl || '/placeholder.png'} alt={item.name} className="w-16 h-16 object-cover mr-4" />
          <div className="flex-1">
            <h3 className="font-bold">{item.name}</h3>
            <p className="text-sm text-gray-600">Cor: {item.color || '-'}, Tamanho: {item.size || '-'}</p>
            <p className="text-blue-600 font-semibold">{formatFromBase(item.price)}</p>
          </div>
          <input
            type="number"
            min={1}
            value={item.quantity}
            onChange={e => updateQuantity(item.id, Number(e.target.value))}
            className="w-16 border rounded px-2 py-1 mr-2"
          />
          <button onClick={() => removeItem(item.id)} className="bg-red-500 text-white px-2 py-1 rounded">Remover</button>
        </div>
      ))}
    </div>
  );
}
