// Página de documentação rápida do admin
import React from 'react';

export default function DocsPage() {
  return (
    <main className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Documentação Rápida do Admin</h1>
      <ul className="list-disc ml-6 mb-4">
        <li>Como gerenciar pedidos, pagamentos e estoque</li>
        <li>Como criar cupons e promoções</li>
        <li>Como acompanhar RMA/trocas/devoluções</li>
        <li>Como configurar integrações externas</li>
        <li>Como usar o painel de auditoria e permissões</li>
        <li>Como personalizar templates de e-mail</li>
        <li>Como visualizar KPIs e gráficos no dashboard</li>
      </ul>
      <p className="text-sm text-gray-600">Para dúvidas, consulte o suporte ou acesse a documentação completa.</p>
    </main>
  );
}
