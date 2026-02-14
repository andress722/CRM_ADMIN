import React, { useState } from 'react';
import SeoHead from '../components/SeoHead';
import { apiFetch } from '../utils/api';
import { useLocale } from '../context/LocaleContext';

const plans = [
  { id: 'basic', name: 'Básico', price: 29.9, benefits: ['Descontos exclusivos', 'Frete reduzido'] },
  { id: 'plus', name: 'Plus', price: 59.9, benefits: ['Frete grátis', 'Atendimento prioritário'] },
  { id: 'premium', name: 'Premium', price: 99.9, benefits: ['Cashback', 'Brindes mensais'] }
];

export default function SubscriptionsPage() {
  const { formatFromBase } = useLocale();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubscribe(planId: string) {
    if (!email) {
      setStatus('Informe seu e-mail para assinar.');
      return;
    }

    setLoading(true);
    setStatus(null);
    const response = await apiFetch('/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: planId, email })
    });

    if (!response.ok) {
      setStatus('Não foi possível criar a assinatura.');
      setLoading(false);
      return;
    }

    setStatus('Assinatura criada com sucesso!');
    setLoading(false);
  }

  return (
    <>
      <SeoHead title="Assinaturas | Loja Online" description="Assine planos e aproveite benefícios exclusivos." />
      <main className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-2">Assinaturas</h1>
        <p className="text-gray-600 mb-6">Escolha um plano e receba benefícios recorrentes.</p>
        <div className="mb-4">
          <input
            type="email"
            placeholder="Seu e-mail"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map(plan => (
            <div key={plan.id} className="border rounded-xl p-4 shadow bg-white flex flex-col">
              <h2 className="text-lg font-semibold mb-1">{plan.name}</h2>
              <p className="text-blue-600 font-bold mb-2">{formatFromBase(plan.price)}/mês</p>
              <ul className="text-sm text-gray-600 mb-4">
                {plan.benefits.map(benefit => (
                  <li key={benefit}>• {benefit}</li>
                ))}
              </ul>
              <button
                disabled={loading}
                onClick={() => handleSubscribe(plan.id)}
                className="mt-auto bg-green-600 text-white px-4 py-2 rounded font-bold"
              >
                Assinar
              </button>
            </div>
          ))}
        </div>
        {status && <p className="mt-4 text-center">{status}</p>}
      </main>
    </>
  );
}
