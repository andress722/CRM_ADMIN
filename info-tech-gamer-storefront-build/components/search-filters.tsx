"use client"

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface SearchFiltersProps {
  query: string
  onQueryChange: (v: string) => void
  category: string
  categories: string[]
  onCategoryChange: (v: string) => void
  minPrice: string
  onMinPriceChange: (v: string) => void
  maxPrice: string
  onMaxPriceChange: (v: string) => void
}

export function SearchFilters({
  query,
  onQueryChange,
  category,
  categories,
  onCategoryChange,
  minPrice,
  onMinPriceChange,
  maxPrice,
  onMaxPriceChange,
}: SearchFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="border-border bg-secondary pl-9 text-sm placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
        />
      </div>
      <Select value={category} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-full border-border bg-secondary text-sm sm:w-44">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent className="border-border bg-card">
          {categories.map((cat) => (
            <SelectItem key={cat} value={cat}>
              {cat}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          placeholder="Min $"
          value={minPrice}
          onChange={(e) => onMinPriceChange(e.target.value)}
          className="w-24 border-border bg-secondary text-sm"
        />
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">to</span>
        <Input
          type="number"
          placeholder="Max $"
          value={maxPrice}
          onChange={(e) => onMaxPriceChange(e.target.value)}
          className="w-24 border-border bg-secondary text-sm"
        />
      </div>
    </div>
  )
}
