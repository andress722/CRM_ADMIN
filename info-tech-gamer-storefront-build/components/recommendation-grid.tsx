"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import type { ProductSummary } from "@/lib/types"

interface RecommendationGridProps {
  items: ProductSummary[]
  title?: string
}

export function RecommendationGrid({ items, title = "Recommended for You" }: RecommendationGridProps) {
  if (items.length === 0) return null

  return (
    <section>
      <div className="mb-6 flex items-center gap-3">
        <div className="h-6 w-1 bg-primary" />
        <h2 className="text-lg font-black uppercase tracking-wider text-foreground">{title}</h2>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {items.map((item) => (
          <Link key={item.id} href={`/product?id=${item.id}`} className="shrink-0">
            <Card className="w-52 overflow-hidden border-border bg-card transition-all hover:border-primary/30 hover:glow-cyan-sm">
              <div className="aspect-[4/3] bg-secondary">
                <div className="flex h-full w-full items-center justify-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Product
                </div>
              </div>
              <CardContent className="p-3">
                <h3 className="line-clamp-1 text-xs font-bold text-foreground">{item.name}</h3>
                <p className="mt-1 font-mono text-sm font-bold text-primary">${item.price.toFixed(2)}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  )
}
