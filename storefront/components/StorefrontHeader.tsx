import React from 'react';

export default function StorefrontHeader() {
  return (
    <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Marketplace</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">Aurora Market</h1>
        <p className="text-sm text-slate-500">Produtos premium, vendedores verificados e entregas rapidas.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <a href="/account" className="btn-ghost">Entrar</a>
        <a href="/wishlist" className="btn-ghost">Wishlist</a>
        <a href="/cart" className="btn-secondary">Carrinho</a>
      </div>
    </header>
  );
}
