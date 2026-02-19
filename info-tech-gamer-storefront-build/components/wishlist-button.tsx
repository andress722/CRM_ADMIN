"use client"

import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWishlist } from "@/lib/wishlist-context"
import type { ProductSummary } from "@/lib/types"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface WishlistButtonProps {
  product: ProductSummary
  size?: "sm" | "default"
  showLabel?: boolean
}

export function WishlistButton({ product, size = "default", showLabel = false }: WishlistButtonProps) {
  const { toggle, isInWishlist } = useWishlist()
  const active = isInWishlist(product.id)

  return (
    <Button
      variant="ghost"
      size={size === "sm" ? "icon" : "default"}
      className={cn(
        size === "sm" && "h-8 w-8",
        active && "text-destructive hover:text-destructive"
      )}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggle(product)
        toast.success(active ? "Removed from wishlist" : "Added to wishlist")
      }}
    >
      <Heart className={cn("h-4 w-4", active && "fill-current")} />
      {showLabel && <span className="ml-2">{active ? "Remove from Wishlist" : "Add to Wishlist"}</span>}
      {!showLabel && <span className="sr-only">{active ? "Remove from wishlist" : "Add to wishlist"}</span>}
    </Button>
  )
}
