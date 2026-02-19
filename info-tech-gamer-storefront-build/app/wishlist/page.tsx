"use client"

import { Suspense, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Heart, Share2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useWishlist } from "@/lib/wishlist-context"
import type { ProductSummary } from "@/lib/types"
import { toast } from "sonner"

function WishlistContent() {
  const searchParams = useSearchParams()
  const sharedData = searchParams.get("data")
  const { items, toggle, clearWishlist, shareUrl } = useWishlist()

  const sharedItems = useMemo<ProductSummary[]>(() => {
    if (!sharedData) return []
    try {
      return JSON.parse(decodeURIComponent(sharedData))
    } catch {
      return []
    }
  }, [sharedData])

  const isSharedView = !!sharedData
  const displayItems = isSharedView ? sharedItems : items

  function handleShare() {
    const url = shareUrl()
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Wishlist link copied!")
    }).catch(() => {
      toast.error("Failed to copy link.")
    })
  }

  if (displayItems.length === 0) {
    return (
      <div className="mx-auto max-w-[1200px] px-6 py-20 text-center">
        <Heart className="mx-auto h-16 w-16 text-muted-foreground/20" />
        <h1 className="mt-4 text-xl font-black uppercase tracking-wider text-foreground">
          {isSharedView ? "Empty Wishlist" : "Your Wishlist is Empty"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isSharedView
            ? "The shared wishlist contains no items."
            : "Start adding gear by clicking the heart icon."}
        </p>
        <Button asChild className="mt-6 bg-primary text-xs font-bold uppercase tracking-wider text-primary-foreground">
          <Link href="/#catalog">Browse Catalog</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black uppercase tracking-wider text-foreground">
            {isSharedView ? "Shared Wishlist" : "My Wishlist"}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">{displayItems.length} items</p>
        </div>
        {!isSharedView && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleShare} className="border-border text-xs font-bold uppercase tracking-wider text-muted-foreground hover:border-primary hover:text-primary">
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            <Button
              variant="outline"
              className="border-border text-xs font-bold uppercase tracking-wider text-destructive hover:border-destructive hover:text-destructive"
              onClick={() => {
                clearWishlist()
                toast.success("Wishlist cleared.")
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {displayItems.map((item) => (
          <Card key={item.id} className="group overflow-hidden border-border bg-card transition-colors hover:border-primary/30">
            <Link href={`/product?id=${item.id}`}>
              <div className="aspect-[4/3] bg-secondary">
                <div className="flex h-full w-full items-center justify-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Product
                </div>
              </div>
            </Link>
            <CardContent className="p-4">
              <Link href={`/product?id=${item.id}`}>
                <h3 className="line-clamp-1 text-sm font-bold text-foreground transition-colors group-hover:text-primary">
                  {item.name}
                </h3>
              </Link>
              <p className="mt-1 font-mono text-sm font-bold text-foreground">${item.price.toFixed(2)}</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" asChild className="flex-1 bg-primary text-[10px] font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90">
                  <Link href={`/product?id=${item.id}`}>View</Link>
                </Button>
                {!isSharedView && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-border text-destructive hover:border-destructive hover:text-destructive"
                    onClick={() => {
                      toggle(item)
                      toast.success("Removed from wishlist.")
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default function WishlistPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center"><div className="h-6 w-6 animate-spin border-2 border-primary border-t-transparent" /></div>}>
      <WishlistContent />
    </Suspense>
  )
}
