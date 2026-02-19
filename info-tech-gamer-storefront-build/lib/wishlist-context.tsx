"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import type { ProductSummary } from "./types"
import * as api from "./api"
import { useAuth } from "./auth-context"

interface WishlistContextValue {
  items: ProductSummary[]
  toggle: (product: ProductSummary) => void
  isInWishlist: (productId: string) => boolean
  clearWishlist: () => void
  shareUrl: () => string
}

const WishlistContext = createContext<WishlistContextValue | null>(null)

const WISHLIST_KEY = "infotechgamer-wishlist"

function loadWishlist(): ProductSummary[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(WISHLIST_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveWishlist(items: ProductSummary[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(items))
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ProductSummary[]>([])
  const [mounted, setMounted] = useState(false)
  const [wishlistId, setWishlistId] = useState<string | null>(null)
  const { user } = useAuth()

  const syncFromApi = useCallback(async () => {
    const result = await api.getDefaultWishlist()
    setWishlistId(result.wishlistId)
    setItems(result.items)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    setItems(loadWishlist())
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (user) {
      syncFromApi().catch(() => setItems(loadWishlist()))
      return
    }
    setItems(loadWishlist())
  }, [user, mounted, syncFromApi])

  useEffect(() => {
    if (!mounted) return
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null
    if (!token) saveWishlist(items)
  }, [items, mounted])

  const toggle = useCallback((product: ProductSummary) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null
    if (token && wishlistId) {
      const existing = items.find((i) => i.id === product.id)
      if (existing?.wishlistItemId) {
        api.removeWishlistItem(wishlistId, existing.wishlistItemId)
          .then(syncFromApi)
          .catch(() => {
            setItems((prev) => prev.filter((i) => i.id !== product.id))
          })
      } else {
        api.addWishlistItem(wishlistId, product.id)
          .then((added) => setItems((prev) => [...prev, added]))
          .catch(() => {
            setItems((prev) => [...prev, product])
          })
      }
      return
    }

    setItems((prev) => {
      const exists = prev.find((i) => i.id === product.id)
      if (exists) return prev.filter((i) => i.id !== product.id)
      return [...prev, product]
    })
  }, [items, wishlistId, syncFromApi])

  const isInWishlist = useCallback(
    (productId: string) => items.some((i) => i.id === productId),
    [items]
  )

  const clearWishlist = useCallback(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null
    if (token && wishlistId) {
      Promise.all(
        items
          .filter((i) => i.wishlistItemId)
          .map((i) => api.removeWishlistItem(wishlistId, i.wishlistItemId!))
      )
        .then(() => setItems([]))
        .catch(() => setItems([]))
      return
    }
    setItems([])
  }, [items, wishlistId])

  const shareUrl = useCallback(() => {
    if (typeof window === "undefined") return ""
    const data = encodeURIComponent(JSON.stringify(items.map((i) => ({ id: i.id, name: i.name, price: i.price, imageUrl: i.imageUrl }))))
    return `${window.location.origin}/wishlist?data=${data}`
  }, [items])

  return (
    <WishlistContext.Provider value={{ items, toggle, isInWishlist, clearWishlist, shareUrl }}>
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider")
  return ctx
}
