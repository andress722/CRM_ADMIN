import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { saveCart, getCart } from '../storage';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  total: number;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const load = async () => {
      const stored = await getCart<CartItem[]>();
      if (stored) setItems(stored);
    };
    load();
  }, []);

  useEffect(() => {
    saveCart(items).catch(() => undefined);
  }, [items]);

  const addItem = (item: Omit<CartItem, 'quantity'>) => {
    setItems((prev: CartItem[]) => {
      const existing = prev.find((p: CartItem) => p.id === item.id);
      if (existing) {
        return prev.map((p: CartItem) => (p.id === item.id ? { ...p, quantity: p.quantity + 1 } : p));
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, quantity: number) => {
    setItems((prev: CartItem[]) => prev.map((p: CartItem) => (p.id === id ? { ...p, quantity } : p)).filter((p: CartItem) => p.quantity > 0));
  };

  const removeItem = (id: string) => {
    setItems((prev: CartItem[]) => prev.filter((p: CartItem) => p.id !== id));
  };

  const clear = () => setItems([]);

  const total = useMemo(() => items.reduce((sum: number, item: CartItem) => sum + item.price * item.quantity, 0), [items]);

  const value = useMemo<CartContextValue>(() => ({ items, addItem, updateQuantity, removeItem, clear, total }), [items, total]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
