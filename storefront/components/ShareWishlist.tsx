import React, { useState } from 'react';
import { useWishlist } from '../context/WishlistContext';

export default function ShareWishlist() {
  const ctx = useWishlist();
  const list = ctx.wishlist ?? ctx.items ?? [];
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    try {
      const encoded = encodeURIComponent(JSON.stringify(list));
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const url = `${origin}/wishlist?data=${encoded}`;
      setLink(url);
    } catch {
      setLink('');
    }
  };

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!list || list.length === 0) return null;

  return (
    <div className="flex flex-col items-start gap-3">
      <button
        className="btn-secondary"
        onClick={handleShare}
      >
        Compartilhar minha wishlist
      </button>
      {link && (
        <div className="flex flex-col gap-2">
          <input type="text" value={link} readOnly className="soft-panel w-72" />
          <button className="btn-primary w-fit" onClick={handleCopy}>
            {copied ? 'Copiado!' : 'Copiar link'}
          </button>
        </div>
      )}
    </div>
  );
}
