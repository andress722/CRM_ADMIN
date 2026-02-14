// Contexto de Wishlist/Favoritos
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface WishlistItem {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
}

interface WishlistContextType {
  items: WishlistItem[];
  wishlist: WishlistItem[];
  add: (item: WishlistItem) => void;
  remove: (id: string) => void;
  isFavorite: (id: string) => boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [wishlist, setWishlist] = useState<WishlistItem[]>(() => {
    try {
      const stored = localStorage.getItem('wishlist');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  function add(item: WishlistItem) {
    setWishlist(prev => (prev.find(i => i.id === item.id) ? prev : [...prev, item]));
  }
  function remove(id: string) {
    setWishlist(prev => prev.filter(i => i.id !== id));
  }

  function isFavorite(id: string) {
    return wishlist.some(i => i.id === id);
  }

  return (
    <WishlistContext.Provider value={{ items: wishlist, wishlist, add, remove, isFavorite }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}
