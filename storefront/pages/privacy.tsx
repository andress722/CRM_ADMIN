// Página de política de privacidade LGPD
import React from 'react';
import SeoHead from '../components/SeoHead';

export default function PrivacyPage() {
  return (
    <>
      <SeoHead title="Política de Privacidade | Loja Online" description="Saiba como tratamos seus dados e sua privacidade." />
      <div className="max-w-2xl mx-auto p-6 mt-8 border rounded bg-white shadow">
        <h1 className="text-2xl font-bold mb-4">Política de Privacidade</h1>
        <p className="mb-4">Esta loja respeita a Lei Geral de Proteção de Dados (LGPD). Seus dados são utilizados apenas para fins de processamento de pedidos, entrega e comunicação. Não compartilhamos informações pessoais com terceiros sem consentimento.</p>
        <ul className="list-disc ml-6 mb-4">
          <li>Você pode solicitar a exportação ou anonimização dos seus dados a qualquer momento.</li>
          <li>Utilizamos cookies para melhorar sua experiência de navegação.</li>
          <li>Para dúvidas, entre em contato com o suporte.</li>
        </ul>
        <p className="text-sm text-gray-600">Última atualização: 25/01/2026</p>
      </div>
    </>
  );
}
