import React from 'react';

export default function StorefrontFooter() {
  return (
    <footer className="section-card">
      <div className="grid gap-6 md:grid-cols-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Aurora Market</h3>
          <p className="text-sm text-slate-600">Marketplace completo com curadoria, suporte humano e pagamento seguro.</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-900 mb-2">Ajuda</h4>
          <ul className="text-sm text-slate-600 space-y-1">
            <li><a href="/support" className="hover:text-slate-900">Central de suporte</a></li>
            <li><a href="/track-order" className="hover:text-slate-900">Rastrear pedido</a></li>
            <li><a href="/privacy" className="hover:text-slate-900">Privacidade</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-900 mb-2">Marketplace</h4>
          <ul className="text-sm text-slate-600 space-y-1">
            <li><a href="/subscriptions" className="hover:text-slate-900">Assinaturas</a></li>
            <li><a href="/account" className="hover:text-slate-900">Minha conta</a></li>
            <li><a href="/dashboard" className="hover:text-slate-900">Painel</a></li>
          </ul>
        </div>
      </div>
      <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-500">
        <span>© 2026 Aurora Market. Todos os direitos reservados.</span>
        <span>Pagamentos protegidos • LGPD • SSL</span>
      </div>
    </footer>
  );
}
