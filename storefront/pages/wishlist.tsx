import React from 'react';
import SeoHead from '../components/SeoHead';
import { useLocale } from '../context/LocaleContext';

function parseWishlist(): any[] {
  if (typeof window === 'undefined') return [];
  const params = new URLSearchParams(window.location.search);
  const data = params.get('data');
  if (!data) return [];
  try {
    return JSON.parse(decodeURIComponent(data));
  } catch {
    return [];
  }
}

export default function PublicWishlistPage() {
  const [wishlist, setWishlist] = React.useState<any[]>([]);
  const { formatFromBase } = useLocale();

  React.useEffect(() => {
    setWishlist(parseWishlist());
  }, []);

  return (
    <>
      <SeoHead title="Wishlist Pública | Loja Online" description="Veja a lista de favoritos compartilhada." />
      <main className="max-w-2xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4 text-center">Wishlist Pública</h1>
        {!wishlist.length ? (
          <div className="text-center text-gray-500">Nenhum produto na wishlist.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {wishlist.map(product => (
              <div key={product.id} className="border rounded-xl p-3 bg-white shadow flex flex-col items-center">
                <img src={product.imageUrl || '/placeholder.png'} alt={product.name} className="w-24 h-24 object-cover mb-2 rounded" />
                <span className="font-semibold text-base mb-1">{product.name}</span>
                <span className="text-blue-600 font-bold text-sm">{formatFromBase(product.price)}</span>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
