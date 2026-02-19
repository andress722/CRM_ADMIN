"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Truck, ShieldCheck, BadgeCheck, Lock, Zap, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ProductCard } from "@/components/product-card"
import { SearchFilters } from "@/components/search-filters"
import { PaginationControls } from "@/components/pagination-controls"
import { RecommendationGrid } from "@/components/recommendation-grid"
import { searchProducts, getRecommendations } from "@/lib/api"
import type { Product, ProductSummary } from "@/lib/types"

const PAGE_SIZE = 6

const trustSignals = [
  { icon: Truck, title: "FAST DELIVERY", desc: "Free shipping 99+" },
  { icon: ShieldCheck, title: "3YR WARRANTY", desc: "Extended coverage" },
  { icon: BadgeCheck, title: "VERIFIED", desc: "100% authentic" },
  { icon: Lock, title: "SECURE", desc: "Encrypted payments" },
]

function HomeContent() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get("query") || ""

  const [query, setQuery] = useState(initialQuery)
  const [category, setCategory] = useState("All")
  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")
  const [page, setPage] = useState(1)
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [recommendations, setRecommendations] = useState<ProductSummary[]>([])
  const [loading, setLoading] = useState(true)

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const result = await searchProducts({
        query: query || undefined,
        category: category !== "All" ? category : undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        page,
        pageSize: PAGE_SIZE,
      })
      setProducts(result.items)
      setTotal(result.total)
    } catch {
      setProducts([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [query, category, minPrice, maxPrice, page])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  useEffect(() => {
    getRecommendations().then(setRecommendations).catch(() => {})
  }, [])

  useEffect(() => {
    setPage(1)
  }, [query, category, minPrice, maxPrice])

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        {/* Animated bg grid */}
        <div className="absolute inset-0 bg-[linear-gradient(hsl(175_100%_42%/0.03)_1px,transparent_1px),linear-gradient(90deg,hsl(175_100%_42%/0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
        {/* Glow orb */}
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-primary/3 blur-[100px]" />

        <div className="relative mx-auto max-w-[1200px] px-6 py-24 lg:py-32">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-primary">
              <Zap className="h-3 w-3" />
              New Season Drop
            </div>
            <h1 className="text-4xl font-black uppercase leading-[0.95] tracking-tight text-foreground lg:text-6xl xl:text-7xl">
              <span className="text-balance">Level Up<br />Your Setup</span>
            </h1>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground lg:text-base">
              Premium hardware, verified sellers, and next-day delivery.
              Everything you need to build the ultimate rig.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild className="gap-2 bg-primary text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 hover:glow-cyan-sm">
                <a href="#catalog">
                  Shop Now
                  <ChevronRight className="h-4 w-4" />
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild className="border-border text-sm font-bold uppercase tracking-wider text-muted-foreground hover:border-primary hover:text-primary">
                <Link href="/subscriptions">View Plans</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="border-b border-border bg-card/50">
        <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-4 px-6 py-6 lg:grid-cols-4">
          {trustSignals.map((signal) => (
            <div key={signal.title} className="flex items-center gap-3 p-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-primary/20 bg-primary/5">
                <signal.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-foreground">{signal.title}</p>
                <p className="text-[10px] text-muted-foreground">{signal.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Catalog */}
      <section id="catalog" className="mx-auto max-w-[1200px] px-6 py-12">
        <div className="mb-6 flex items-center gap-3">
          <div className="h-6 w-1 bg-primary" />
          <h2 className="text-lg font-black uppercase tracking-wider text-foreground">Browse Catalog</h2>
        </div>

        <SearchFilters
          query={query}
          onQueryChange={setQuery}
          category={category}
          onCategoryChange={setCategory}
          minPrice={minPrice}
          onMinPriceChange={setMinPrice}
          maxPrice={maxPrice}
          onMaxPriceChange={setMaxPrice}
        />

        <div className="mt-8">
          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <Card key={i} className="overflow-hidden border-border bg-card">
                  <div className="aspect-[4/3] animate-pulse bg-secondary" />
                  <CardContent className="space-y-2 p-4">
                    <div className="h-4 w-3/4 animate-pulse rounded-sm bg-secondary" />
                    <div className="h-4 w-1/2 animate-pulse rounded-sm bg-secondary" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">No products found.</p>
              <p className="mt-1 text-xs text-muted-foreground">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>

        {!loading && totalPages > 1 && (
          <div className="mt-8">
            <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </section>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <section className="mx-auto max-w-[1200px] px-6 pb-12">
          <RecommendationGrid items={recommendations} />
        </section>
      )}
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center"><div className="h-6 w-6 animate-spin border-2 border-primary border-t-transparent" /></div>}>
      <HomeContent />
    </Suspense>
  )
}
