// Componente de listagem de produtos

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWishlist } from '../context/WishlistContext';
import { useNotification } from '../context/NotificationContext';
import { useLocale } from '../context/LocaleContext';
import CategoryFilter from './CategoryFilter';
import Pagination from './Pagination';
import CompareBar from './CompareBar';
import { apiFetch } from '../utils/api';
import { getAccessToken } from '../utils/auth';

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  category?: string;
  rating?: number;
}

export default function ProductList() {
  const { t } = useTranslation();
  const { formatFromBase, formatBase, isBaseCurrency, convertToBase } = useLocale();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [category, setCategory] = useState('Todos');
  const [page, setPage] = useState(1);
  const [compare, setCompare] = useState<Product[]>([]);
  const pageSize = 9;
  const { add, remove, isFavorite } = useWishlist();
  const { notify } = useNotification();

  const minPriceValue = useMemo(() => (minPrice ? convertToBase(Number(minPrice)) : null), [minPrice, convertToBase]);
  const maxPriceValue = useMemo(() => (maxPrice ? convertToBase(Number(maxPrice)) : null), [maxPrice, convertToBase]);

  const suggestions = useMemo(() => {
    if (search.trim().length < 2) return [];
    return products.slice(0, 5);
  }, [search, products]);

  useEffect(() => {
    setPage(1);
  }, [search, minPrice, maxPrice, category]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set('query', search.trim());
        if (category !== 'Todos') params.set('category', category);
        if (minPriceValue !== null) params.set('minPrice', minPriceValue.toString());
        if (maxPriceValue !== null) params.set('maxPrice', maxPriceValue.toString());
        params.set('page', page.toString());
        params.set('pageSize', pageSize.toString());

        const response = await apiFetch(`/products/search?${params.toString()}`, { signal: controller.signal, skipAuth: true });
        if (!response.ok) throw new Error('Erro ao buscar produtos');
        const data = await response.json();
        setProducts(Array.isArray(data.items) ? data.items : []);
        setTotal(typeof data.total === 'number' ? data.total : 0);
      } catch {
        setProducts([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
    return () => controller.abort();
  }, [search, category, minPriceValue, maxPriceValue, page, pageSize]);

  useEffect(() => {
    if (search.trim().length < 2) return;
    const handler = setTimeout(async () => {
      if (!getAccessToken()) return;
      try {
        await apiFetch('/analytics/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: null,
            type: 'Search',
            category: 'Search',
            action: 'Query',
            label: search.trim(),
            value: total,
            url: typeof window !== 'undefined' ? window.location.href : null
          })
        });
      } catch {
        // ignore analytics errors
      }
    }, 600);

    return () => clearTimeout(handler);
  }, [search, total]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (loading) return <div>{t('Loading products...')}</div>;

  return (
    <>
      <CategoryFilter onSelect={setCategory} />
      <div className="mb-4 flex flex-col sm:flex-row gap-2 items-center">
        <input
          type="text"
          placeholder={t('Search product...')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border rounded px-2 py-1 w-full sm:w-1/3"
        />
        {suggestions.length > 0 && (
          <div className="relative w-full sm:w-1/3">
            <ul className="absolute z-10 bg-white border rounded shadow w-full max-h-48 overflow-auto">
              {suggestions.map((product) => (
                <li key={product.id} className="px-2 py-1 hover:bg-gray-100 cursor-pointer"
                    onClick={() => setSearch(product.name)}>
                  {product.name}
                </li>
              ))}
            </ul>
          </div>
        )}
        <input
          type="number"
          placeholder={t('Min Price')}
          value={minPrice}
          onChange={e => setMinPrice(e.target.value)}
          className="border rounded px-2 py-1 w-full sm:w-1/6"
        />
        <input
          type="number"
          placeholder={t('Max Price')}
          value={maxPrice}
          onChange={e => setMaxPrice(e.target.value)}
          className="border rounded px-2 py-1 w-full sm:w-1/6"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 px-2 sm:px-0">
        {products.map((product) => {
          const isCompared = compare.some(p => p.id === product.id);
          return (
            <div key={product.id} className="border rounded-xl p-3 sm:p-4 bg-white shadow flex flex-col relative">
              <button
                aria-label={isFavorite(product.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                className={`absolute top-2 right-2 text-xl p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500 transition-colors ${isFavorite(product.id) ? 'bg-pink-100 text-pink-600' : 'bg-gray-100 text-gray-400'}`}
                onClick={() => {
                  if (isFavorite(product.id)) {
                    remove(product.id);
                    notify('Removido dos favoritos', 'info');
                  } else {
                    add({ id: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl });
                    notify('Adicionado aos favoritos', 'success');
                  }
                }}
              >
                {isFavorite(product.id) ? '♥' : '♡'}
              </button>
              <button
                aria-label={isCompared ? 'Remover da comparação' : 'Adicionar à comparação'}
                className={`absolute top-2 left-2 text-xs p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${isCompared ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}
                onClick={() => {
                  if (isCompared) {
                    setCompare(compare.filter(p => p.id !== product.id));
                  } else {
                    setCompare([...compare, product]);
                  }
                }}
              >
                {isCompared ? '⇄' : '≡'}
              </button>
              <img src={product.imageUrl || '/placeholder.png'} alt={product.name} loading="lazy" className="w-full h-40 sm:h-48 object-cover mb-2 rounded-lg" />
              <h2 className="text-base sm:text-lg font-bold mb-1 mt-2">{product.name}</h2>
              <p className="text-blue-600 font-semibold mb-1 text-sm sm:text-base">{formatFromBase(product.price)}</p>
              {!isBaseCurrency && (
                <p className="text-[11px] text-gray-500 mb-2">{t('Charged in BRL')}: {formatBase(product.price)}</p>
              )}
              <a href={`/product?id=${product.id}`} className="bg-blue-500 text-white px-4 py-2 rounded-lg text-center text-sm sm:text-base mt-auto active:scale-95 transition-transform">{t('View details')}</a>
            </div>
          );
        })}
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      <CompareBar products={compare} onRemove={(id: string) => setCompare(compare.filter(p => p.id !== id))} />
    </>
  );
}
