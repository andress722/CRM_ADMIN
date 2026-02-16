
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

export default function Home() {
  const { t } = useTranslation();
  useEffect(() => {
    captureAffiliateRefFromUrl();
  }, []);
  return (
    <NotificationProvider>
      <WishlistProvider>
        <SeoHead
          title="Loja Online | Catálogo de Produtos"
          description="Confira os melhores produtos da nossa loja online. Preços, ofertas e novidades!"
        />
        <main className="page-shell">
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Marketplace</p>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">Aurora Market</h1>
            </div>
            <div className="flex items-center gap-3">
              <a href="/cart" className="btn-ghost">Carrinho</a>
              <a href="/support" className="btn-secondary">Suporte</a>
            </div>
          </header>

          <section className="hero fade-in">
            <div className="relative z-10 flex flex-col gap-6 max-w-3xl">
              <div className="flex flex-wrap gap-3 items-center">
                <span className="chip">Nova colecao 2026</span>
                <span className="chip">Entrega expressa</span>
                <span className="chip">Pagamento seguro</span>
              </div>
              <h2 className="text-4xl sm:text-5xl font-bold">{t('Product Catalog')}</h2>
              <p className="text-lg sm:text-xl text-slate-100">
                Curadoria de produtos premium, filtros inteligentes e recomendações sob medida.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href="#catalog" className="btn-primary">Explorar catalogo</a>
                <a href="#recommendations" className="btn-ghost">Ver recomendacoes</a>
              </div>
            </div>
          </section>

          <section className="section-card fade-in">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Seu painel de preferencias</h2>
                <p className="text-slate-600">Idioma, acessibilidade e notificacoes em um so lugar.</p>
              </div>
              <LanguageSwitcher />
            </div>
            <div className="mt-6 flex flex-wrap gap-4 items-center">
              <AccessibilityBar />
              <FeedbackButton />
              <ShareWishlist />
              <PushNotificationPrompt />
            </div>
          </section>

          <section id="catalog" className="section-card fade-in">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Catalogo inteligente</h2>
                <p className="text-slate-600">Pesquise, compare e monte sua lista com poucos cliques.</p>
              </div>
            </div>
            <ProductList />
          </section>

          <section className="section-card fade-in">
            <RecentlyViewed />
          </section>

          <section id="recommendations" className="section-card fade-in">
            <Recommendations />
          </section>

          <section className="section-card fade-in">
            <PaymentMethods />
          </section>

          <LgpdBanner />
        </main>
      </WishlistProvider>
    </NotificationProvider>
  );
}