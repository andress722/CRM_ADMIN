
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
        <main>
          <LanguageSwitcher />
          <h1 className="text-2xl font-bold mb-4 text-center">{t('Product Catalog')}</h1>
          <AccessibilityBar />
          <FeedbackButton />
          <ShareWishlist />
          <PushNotificationPrompt />
          <RecentlyViewed />
          <ProductList />
          <Recommendations />
          <PaymentMethods />
          <LgpdBanner />
        </main>
      </WishlistProvider>
    </NotificationProvider>
  );
}