"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Star, ShoppingCart, Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { WishlistButton } from "@/components/wishlist-button"
import { RecommendationGrid } from "@/components/recommendation-grid"
import { useCart } from "@/lib/cart-context"
import { useLocale } from "@/lib/locale-context"
import { getProduct, getRecommendations } from "@/lib/api"
import type { Product, ProductSummary } from "@/lib/types"
import { toast } from "sonner"

function ProductContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get("id")
  const [product, setProduct] = useState<Product | null>(null)
  const [recommendations, setRecommendations] = useState<ProductSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [qty, setQty] = useState(1)
  const [adding, setAdding] = useState(false)
  const { addItem } = useCart()
  const { t } = useLocale()

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getProduct(id)
      .then((p) => setProduct(p))
      .catch(() => setProduct(null))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    getRecommendations().then(setRecommendations).catch(() => {})
  }, [])

  if (loading) {
    return (
      <div className="mx-auto max-w-[1200px] px-6 py-12">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="aspect-square animate-pulse bg-secondary" />
          <div className="space-y-4">
            <div className="h-8 w-3/4 animate-pulse rounded-sm bg-secondary" />
            <div className="h-6 w-1/4 animate-pulse rounded-sm bg-secondary" />
            <div className="h-20 w-full animate-pulse rounded-sm bg-secondary" />
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-[1200px] px-6 py-20 text-center">
        <h1 className="text-xl font-black uppercase tracking-wider text-foreground">{t("Product Not Found", "Produto não encontrado")}</h1>
      </div>
    )
  }

  const stockStatus = product.stock && product.stock > 0 ? (product.stock <= 5 ? t("Low Stock", "Estoque baixo") : t("In Stock", "Disponível")) : t("Out of Stock", "Sem estoque")

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="aspect-square overflow-hidden border border-border bg-secondary">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-bold uppercase tracking-widest text-muted-foreground">{product.category}</div>
          )}
        </div>

        <div className="flex flex-col">
          {product.brand && <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{product.brand}</p>}
          <h1 className="mt-1 text-2xl font-black uppercase tracking-tight text-foreground lg:text-3xl">{product.name}</h1>

          {product.rating && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < Math.floor(product.rating!) ? "fill-primary text-primary" : "fill-secondary text-secondary"}`} />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">{product.rating.toFixed(1)}</span>
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <span className="font-mono text-3xl font-bold text-foreground">${product.price.toFixed(2)}</span>
            <Badge variant={stockStatus === t("In Stock", "Disponível") ? "default" : stockStatus === t("Low Stock", "Estoque baixo") ? "secondary" : "destructive"} className="text-[10px] font-bold uppercase tracking-wider">{stockStatus}</Badge>
          </div>

          <Separator className="my-6 bg-border" />
          {product.description && <p className="text-sm leading-relaxed text-muted-foreground">{product.description}</p>}
          <Separator className="my-6 bg-border" />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 border border-border bg-secondary p-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => setQty(Math.max(1, qty - 1))}><Minus className="h-4 w-4" /></Button>
              <span className="w-8 text-center font-mono text-sm font-bold text-foreground">{qty}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => setQty(qty + 1)}><Plus className="h-4 w-4" /></Button>
            </div>
            <Button
              size="lg"
              className={`flex-1 gap-2 bg-primary text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 hover:glow-cyan-sm sm:flex-none ${adding ? "cart-bump" : ""}`}
              disabled={stockStatus === t("Out of Stock", "Sem estoque")}
              onClick={() => {
                setAdding(true)
                addItem(product, qty)
                toast.success(t("Item added to cart", "Item adicionado ao carrinho"))
                setTimeout(() => setAdding(false), 420)
              }}
            >
              <ShoppingCart className="h-4 w-4" />
              {t("Add to Cart", "Adicionar ao carrinho")}
            </Button>
            <WishlistButton product={{ id: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl }} showLabel />
          </div>
        </div>
      </div>

      {recommendations.length > 0 && (
        <div className="mt-16">
          <RecommendationGrid items={recommendations.filter((r) => r.id !== product.id)} title={t("You May Also Like", "Você também pode gostar")} />
        </div>
      )}
    </div>
  )
}

export default function ProductPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center"><div className="h-6 w-6 animate-spin border-2 border-primary border-t-transparent" /></div>}>
      <ProductContent />
    </Suspense>
  )
}
