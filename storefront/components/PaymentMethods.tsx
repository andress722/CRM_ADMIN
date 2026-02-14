import React, { useState } from 'react';

export default function PaymentMethods() {
  const [selected, setSelected] = useState('pix');

  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold mb-4">Formas de Pagamento</h2>
      <div className="flex gap-4 mb-4">
        <button
          className={`px-4 py-2 rounded font-bold border ${selected === 'pix' ? 'bg-green-600 text-white' : 'bg-gray-100'}`}
          onClick={() => setSelected('pix')}
        >
          Pix
        </button>
        <button
          className={`px-4 py-2 rounded font-bold border ${selected === 'card' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          onClick={() => setSelected('card')}
        >
          Cartão
        </button>
        <button
          className={`px-4 py-2 rounded font-bold border ${selected === 'boleto' ? 'bg-yellow-600 text-white' : 'bg-gray-100'}`}
          onClick={() => setSelected('boleto')}
        >
          Boleto
        </button>
      </div>
      <div className="border rounded p-4 bg-white">
        {selected === 'pix' && <p>Chave Pix: loja@email.com</p>}
        {selected === 'card' && <p>Insira os dados do cartão no checkout.</p>}
        {selected === 'boleto' && <p>O boleto será gerado após o pedido.</p>}
      </div>
    </section>
  );
}
