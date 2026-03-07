"use client"

import Link from "next/link"
import { Star } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { WishlistButton } from "@/components/wishlist-button"
import { useCart } from "@/lib/cart-context"
import type { Product } from "@/lib/types"
import { toast } from "sonner"

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart()

  return (
    <Card className="group overflow-hidden border-border bg-card transition-all hover:border-primary/30 hover:glow-cyan-sm">
      <Link href={`/product?id=${product.id}`}>
        <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              {product.category}
            </div>
          )}
          <div className="absolute inset-0 bg-primary/0 transition-colors group-hover:bg-primary/5" />
        </div>
      </Link>
      <CardContent className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <Link href={`/product?id=${product.id}`} className="flex-1">
            <h3 className="line-clamp-2 text-sm font-bold leading-tight text-foreground transition-colors group-hover:text-primary">
              {product.name}
            </h3>
          </Link>
          <WishlistButton
            product={{
              id: product.id,
              name: product.name,
              price: product.price,
              imageUrl: product.imageUrl,
            }}
            size="sm"
          />
        </div>

        {product.rating && (
          <div className="mb-2 flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-3 w-3 ${
                  i < Math.floor(product.rating!)
                    ? "fill-primary text-primary"
                    : "fill-secondary text-secondary"
                }`}
              />
            ))}
            <span className="ml-1 text-[10px] text-muted-foreground">
              {product.rating.toFixed(1)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-lg font-bold text-foreground">
            ${product.price.toFixed(2)}
          </span>
          <Button
            size="sm"
            className="bg-primary text-[10px] font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
            onClick={() => {
              addItem(product)
              toast.success(`${product.name} added to cart`)
            }}
          >
            Add to Cart
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

