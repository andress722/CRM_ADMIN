import React from 'react';

export default function StorefrontHeader() {
  return (
    <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">InfoTechGamer</p>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">InfoTechGamer</h1>
          </div>
        </div>
        <p className="text-sm text-slate-500">Marketplace premium de tecnologia e gaming com curadoria real.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <nav className="hidden lg:flex items-center gap-5">
          <a href="#catalog" className="nav-link">Catalogo</a>
          <a href="#recommendations" className="nav-link">Recomendacoes</a>
          <a href="/support" className="nav-link">Suporte</a>
        </nav>
        <div className="flex flex-wrap items-center gap-3">
          <a href="/account" className="btn-secondary">Entrar</a>
          <a href="/wishlist" className="btn-ghost">Wishlist</a>
          <a href="/cart" className="btn-primary">Carrinho</a>
        </div>
      </div>
    </header>
  );
}
