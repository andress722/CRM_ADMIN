// Resumo do carrinho e botão para checkout
import React from 'react';
import { useCart } from '../context/CartContext';
import { useRouter } from 'next/router';
import { useLocale } from '../context/LocaleContext';

export default function CartSummary() {
  const { items } = useCart();
  const router = useRouter();
  const { formatFromBase } = useLocale();

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="mt-6 p-4 border rounded bg-gray-50">
      <h2 className="text-lg font-bold mb-2">Resumo do Carrinho</h2>
      <p className="mb-2">Total de itens: {items.length}</p>
      <p className="mb-4 text-blue-600 font-semibold">Total: {formatFromBase(total)}</p>
      <button
        className="bg-green-600 text-white px-6 py-2 rounded font-bold w-full"
        disabled={items.length === 0}
        onClick={() => router.push('/checkout')}
      >
        Ir para o Checkout
      </button>
    </div>
  );
}
