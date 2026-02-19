"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import type { CartItem, Product } from "./types"
import * as api from "./api"
import { useAuth } from "./auth-context"

interface CartContextValue {
  items: CartItem[]
  addItem: (product: Product, qty?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, qty: number) => void
  clearCart: () => void
  itemCount: number
  subtotal: number
}

const CartContext = createContext<CartContextValue | null>(null)

const CART_KEY = "infotechgamer-cart"

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(CART_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveCart(items: CartItem[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(CART_KEY, JSON.stringify(items))
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [mounted, setMounted] = useState(false)
  const { user } = useAuth()

  const syncFromApi = useCallback(async () => {
    try {
      const data = await api.getCart()
      setItems(data)
    } catch {
      setItems(loadCart())
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    setItems(loadCart())
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (user) {
      syncFromApi()
      return
    }
    setItems(loadCart())
  }, [user, mounted, syncFromApi])

  useEffect(() => {
    if (!mounted) return
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null
    if (!token) saveCart(items)
  }, [items, mounted])

  const addItem = useCallback((product: Product, qty = 1) => {
    if (typeof window !== "undefined" && localStorage.getItem("accessToken")) {
      api.addToCart(product.id, qty)
        .then(syncFromApi)
        .catch(() => {
          setItems((prev) => [...prev, { product, quantity: qty }])
        })
      return
    }

    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + qty }
            : i
        )
      }
      return [...prev, { product, quantity: qty }]
    })
  }, [syncFromApi])

  const removeItem = useCallback((productId: string) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null
    const item = items.find((i) => i.product.id === productId)
    if (token && item?.id) {
      api.removeCartItem(item.id)
        .then(syncFromApi)
        .catch(() => {
          setItems((prev) => prev.filter((i) => i.product.id !== productId))
        })
      return
    }

    setItems((prev) => prev.filter((i) => i.product.id !== productId))
  }, [items, syncFromApi])

  const updateQuantity = useCallback((productId: string, qty: number) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null
    const item = items.find((i) => i.product.id === productId)

    if (qty <= 0) {
      if (token && item?.id) {
        api.removeCartItem(item.id).then(syncFromApi).catch(() => {
          setItems((prev) => prev.filter((i) => i.product.id !== productId))
        })
        return
      }
      setItems((prev) => prev.filter((i) => i.product.id !== productId))
      return
    }

    if (token && item?.id) {
      api.updateCartItem(item.id, qty)
        .then(syncFromApi)
        .catch(() => {
          setItems((prev) =>
            prev.map((i) =>
              i.product.id === productId ? { ...i, quantity: qty } : i
            )
          )
        })
      return
    }

    setItems((prev) =>
      prev.map((i) =>
        i.product.id === productId ? { ...i, quantity: qty } : i
      )
    )
  }, [items, syncFromApi])

  const clearCart = useCallback(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null
    if (token) {
      api.clearCartApi().then(() => setItems([])).catch(() => setItems([]))
      return
    }
    setItems([])
  }, [])

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)
  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0)

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, itemCount, subtotal }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within CartProvider")
  return ctx
}
