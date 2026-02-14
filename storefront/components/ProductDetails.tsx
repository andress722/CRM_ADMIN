// Componente de detalhes do produto (PDP)

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ProductReviews from './ProductReviews';
import { useNotification } from '../context/NotificationContext';
import { useLocale } from '../context/LocaleContext';
import SeoHead from './SeoHead';

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  description?: string;
  variations?: Array<{ color: string; size: string }>;
}

export default function ProductDetails({ id }: { id: string }) {
  const { t } = useTranslation();
  const { formatFromBase, formatBase, isBaseCurrency } = useLocale();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const { notify } = useNotification();

  useEffect(() => {
    const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5071';
    const apiBase = rawApiUrl.replace(/\/+$/, '');
    const apiUrl = apiBase.endsWith('/api/v1') ? apiBase : `${apiBase}/api/v1`;
    fetch(`${apiUrl}/products/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setProduct(data);
        setLoading(false);
        // Adiciona ao histórico de visualização
        try {
          const stored = localStorage.getItem('recentlyViewed');
          let viewed = stored ? JSON.parse(stored) : [];
          viewed = viewed.filter((p: Product) => p.id !== data.id);
          viewed.unshift(data);
          if (viewed.length > 10) viewed = viewed.slice(0, 10);
          localStorage.setItem('recentlyViewed', JSON.stringify(viewed));
        } catch {}
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div>{t('Loading product...')}</div>;
  if (!product) return <div>{t('Product not found.')}</div>;

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const text = `${product.name} - ${formatFromBase(product.price)}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, text, url });
        notify('Link compartilhado!', 'success');
        return;
      } catch {}
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      notify('Link copiado!', 'success');
      return;
    }

    notify('Não foi possível compartilhar agora.', 'error');
  };

  const siteUrl = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SITE_URL : undefined;
  const canonicalUrl = siteUrl ? `${siteUrl}/product?id=${product.id}` : undefined;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || undefined,
    sku: product.id,
    image: product.imageUrl ? [product.imageUrl] : undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'BRL',
      price: product.price,
      availability: 'https://schema.org/InStock'
    }
  };

  return (
    <div className="max-w-lg mx-auto p-3 sm:p-6 border rounded-xl bg-white shadow">
      <SeoHead
        title={`${product.name} | Loja Online`}
        description={product.description || t('Product not found.')}
        ogType="product"
        ogImage={product.imageUrl}
        canonicalUrl={canonicalUrl}
        schema={schema}
      />
      <img src={product.imageUrl || '/placeholder.png'} alt={product.name} className="w-full h-48 sm:h-64 object-cover mb-3 rounded-lg" />
      <h2 className="text-xl sm:text-2xl font-bold mb-2 mt-2">{product.name}</h2>
      <p className="text-blue-600 font-semibold mb-1 text-base sm:text-xl">{formatFromBase(product.price)}</p>
      {!isBaseCurrency && (
        <p className="text-xs text-gray-500 mb-2">{t('Charged in BRL')}: {formatBase(product.price)}</p>
      )}
      <p className="mb-4 text-gray-700 text-sm sm:text-base">{product.description}</p>
      {product.variations && (
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="block mb-1 font-medium">{t('Color')}:</label>
            <select value={selectedColor} onChange={e => setSelectedColor(e.target.value)} className="border rounded px-2 py-1 w-full">
              <option value="">{t('Select')}</option>
              {[...new Set(product.variations.map((v: { color: string }) => v.color))].map((color: string) => (
                <option key={color} value={color}>{color}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-1 font-medium">{t('Size')}:</label>
            <select value={selectedSize} onChange={e => setSelectedSize(e.target.value)} className="border rounded px-2 py-1 w-full">
              <option value="">{t('Select')}</option>
              {[...new Set(product.variations.map((v: { size: string }) => v.size))].map((size: string) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
        </div>
      )}
      <button
        className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold w-full text-base sm:text-lg active:scale-95 transition-transform"
        onClick={() => notify('Produto adicionado ao carrinho!', 'success')}
      >
        {t('Add to Cart')}
      </button>
      <button
        className="mt-3 w-full border border-blue-500 text-blue-600 px-6 py-2 rounded-lg font-semibold"
        onClick={handleShare}
      >
        {t('Share')}
      </button>
      {/* Avaliações/reviews */}
      <div>
        {product.id && <ProductReviews productId={product.id} />}
      </div>
    </div>
  );
}
