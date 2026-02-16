import React, { useState } from 'react';

export default function PaymentMethods() {
  const [selected, setSelected] = useState('pix');

  return (
    <section>
      <h2 className="section-title mb-4">Formas de pagamento</h2>
      <div className="flex flex-wrap gap-3 mb-4">
        <button
          className={`pill-button ${selected === 'pix' ? 'pill-button-active' : ''}`}
          onClick={() => setSelected('pix')}
        >
          Pix
        </button>
        <button
          className={`pill-button ${selected === 'card' ? 'pill-button-active' : ''}`}
          onClick={() => setSelected('card')}
        >
          Cartão
        </button>
        <button
          className={`pill-button ${selected === 'boleto' ? 'pill-button-active' : ''}`}
          onClick={() => setSelected('boleto')}
        >
          Boleto
        </button>
      </div>
      <div className="soft-panel text-sm text-slate-700">
        {selected === 'pix' && <p>Chave Pix: pagamentos@infotechgamer.com</p>}
        {selected === 'card' && <p>Insira os dados do cartao no checkout.</p>}
        {selected === 'boleto' && <p>O boleto sera gerado apos o pedido.</p>}
      </div>
    </section>
  );
}
