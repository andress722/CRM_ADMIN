import React, { useState } from 'react';

export default function PaymentMethods() {
  const [selected, setSelected] = useState('pix');

  return (
    <section>
      <h2 className="text-2xl font-bold mb-4 text-slate-900">Formas de Pagamento</h2>
      <div className="flex flex-wrap gap-3 mb-4">
        <button
          className={`px-4 py-2 rounded-full font-semibold border ${selected === 'pix' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200'}`}
          onClick={() => setSelected('pix')}
        >
          Pix
        </button>
        <button
          className={`px-4 py-2 rounded-full font-semibold border ${selected === 'card' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200'}`}
          onClick={() => setSelected('card')}
        >
          Cartão
        </button>
        <button
          className={`px-4 py-2 rounded-full font-semibold border ${selected === 'boleto' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-700 border-slate-200'}`}
          onClick={() => setSelected('boleto')}
        >
          Boleto
        </button>
      </div>
      <div className="soft-panel">
        {selected === 'pix' && <p>Chave Pix: loja@email.com</p>}
        {selected === 'card' && <p>Insira os dados do cartão no checkout.</p>}
        {selected === 'boleto' && <p>O boleto será gerado após o pedido.</p>}
      </div>
    </section>
  );
}
