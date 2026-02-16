
import ProductList from '../components/ProductList';
import RecentlyViewed from '../components/RecentlyViewed';
import PushNotificationPrompt from '../components/PushNotificationPrompt';
import AccessibilityBar from '../components/AccessibilityBar';
import FeedbackButton from '../components/FeedbackButton';
import ShareWishlist from '../components/ShareWishlist';
import { WishlistProvider } from '../context/WishlistContext';
import LgpdBanner from '../components/LgpdBanner';
import { NotificationProvider } from '../context/NotificationContext';
import '../i18n';
import LanguageSwitcher from '../components/LanguageSwitcher';
import Recommendations from '../components/Recommendations';
import PaymentMethods from '../components/PaymentMethods';
import SeoHead from '../components/SeoHead';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { captureAffiliateRefFromUrl } from '../utils/affiliate';
import StorefrontHeader from '../components/StorefrontHeader';
import StorefrontFooter from '../components/StorefrontFooter';

export default function Home() {
  const { t } = useTranslation();
  useEffect(() => {
    captureAffiliateRefFromUrl();
  }, []);
  return (
    <NotificationProvider>
      <WishlistProvider>
        <SeoHead
          title="InfoTechGamer | Marketplace Premium"
          description="Curadoria premium de tecnologia e gaming. Produtos, ofertas e recomendacoes sob medida."
        />
        <main className="page-shell">
          <StorefrontHeader />

          <section className="hero fade-in">
            <div className="relative z-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="flex flex-col gap-6">
                <div className="flex flex-wrap gap-3 items-center">
                  <span className="chip">Drops premium</span>
                  <span className="chip">Entrega 24-48h</span>
                  <span className="chip">Pagamentos seguros</span>
                </div>
                <h2 className="text-4xl sm:text-5xl font-bold">Tecnologia e gaming em curadoria de alto nivel.</h2>
                <p className="text-lg sm:text-xl text-slate-600">
                  Produtos selecionados, comparacao clara e uma experiencia feita para quem leva setup a serio.
                </p>
                <div className="flex flex-wrap gap-3">
                  <a href="#catalog" className="btn-primary">Explorar catalogo</a>
                  <a href="#recommendations" className="btn-ghost">Recomendacoes</a>
                  <a href="/account" className="btn-secondary">Entrar agora</a>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                  <span>Mais de 1.400 itens ativos</span>
                  <span>Vendedores verificados</span>
                  <span>Garantia de 30 dias</span>
                </div>
              </div>
              <div className="grid gap-4">
                <div className="stat-card">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-300">InfoTechGamer</p>
                  <p className="mt-2 text-2xl font-bold">Setup Pro</p>
                  <p className="text-sm text-slate-300">Combos premium com garantia estendida.</p>
                </div>
                <div className="soft-panel">
                  <p className="text-sm font-semibold text-slate-900">Comparacao inteligente</p>
                  <p className="text-xs text-slate-500">Veja desempenho, reviews e disponibilidade em segundos.</p>
                </div>
                <div className="soft-panel">
                  <p className="text-sm font-semibold text-slate-900">Suporte humano</p>
                  <p className="text-xs text-slate-500">Especialistas para ajudar na compra certa.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="section-card fade-in">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="section-title">Experiencia premium em todas as etapas</h2>
                <p className="section-lead">Entrega rapida, seguranca e garantia em cada compra.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="soft-panel">
                  <p className="text-sm font-semibold text-slate-900">Vendedores verificados</p>
                  <p className="text-xs text-slate-500">Compra segura e entregas acompanhadas.</p>
                </div>
                <div className="soft-panel">
                  <p className="text-sm font-semibold text-slate-900">Garantia estendida</p>
                  <p className="text-xs text-slate-500">Devolucao facilitada em ate 30 dias.</p>
                </div>
                <div className="soft-panel">
                  <p className="text-sm font-semibold text-slate-900">Ofertas inteligentes</p>
                  <p className="text-xs text-slate-500">Alertas de preco e recomendacoes personalizadas.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="section-card fade-in">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <h2 className="section-title">Preferencias e utilitarios</h2>
                <p className="section-lead">Personalize idioma, acessibilidade e notificacoes.</p>
              </div>
              <LanguageSwitcher />
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="soft-panel">
                <AccessibilityBar />
              </div>
              <div className="soft-panel">
                <FeedbackButton />
              </div>
              <div className="soft-panel">
                <ShareWishlist />
              </div>
              <div className="soft-panel">
                <PushNotificationPrompt />
              </div>
            </div>
          </section>

          <section id="catalog" className="section-card fade-in">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
              <div>
                <h2 className="section-title">Catalogo inteligente</h2>
                <p className="section-lead">Pesquise, compare e monte sua lista com poucos cliques.</p>
              </div>
            </div>
            <ProductList />
          </section>

          <section className="section-card fade-in">
            <RecentlyViewed />
          </section>

          <section className="section-card fade-in">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h2 className="section-title">Lojas em destaque</h2>
                <p className="section-lead">Marcas de tecnologia e creators de gaming verificados.</p>
              </div>
              <a href="/support" className="btn-ghost">Quero vender</a>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {['Nebula Gear', 'Auric Labs', 'LevelUp Studio'].map((seller) => (
                <div key={seller} className="soft-panel">
                  <p className="text-sm font-semibold text-slate-900">{seller}</p>
                  <p className="text-xs text-slate-500">Equipamentos premium e envio express.</p>
                </div>
              ))}
            </div>
          </section>

          <section id="recommendations" className="section-card fade-in">
            <Recommendations />
          </section>

          <section className="section-card fade-in">
            <PaymentMethods />
          </section>

          <section className="section-card fade-in">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="section-title">Assine novidades</h2>
                <p className="section-lead">Receba ofertas e lancamentos direto no seu e-mail.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <input className="input-field w-full sm:w-64" placeholder="Seu e-mail" />
                <button className="btn-primary">Quero receber</button>
              </div>
            </div>
          </section>

          <LgpdBanner />
          <StorefrontFooter />
        </main>
      </WishlistProvider>
    </NotificationProvider>
  );
}