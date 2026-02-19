"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  ShoppingCart,
  Heart,
  User,
  Search,
  Menu,
  LogOut,
  LayoutDashboard,
  Package,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/lib/auth-context"
import { useCart } from "@/lib/cart-context"
import { useWishlist } from "@/lib/wishlist-context"

const navLinks = [
  { href: "/", label: "STORE" },
  { href: "/subscriptions", label: "PLANS" },
  { href: "/support", label: "SUPPORT" },
]

export function Header() {
  const router = useRouter()
  const { user, isAuthenticated, logout } = useAuth()
  const { itemCount } = useCart()
  const { items: wishlistItems } = useWishlist()
  const [searchQuery, setSearchQuery] = useState("")
  const [mobileOpen, setMobileOpen] = useState(false)

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/?query=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-4 px-6">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2 group">
          <div className="flex h-8 w-8 items-center justify-center bg-primary transition-shadow group-hover:glow-cyan-sm">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="hidden sm:flex sm:flex-col sm:leading-none">
            <span className="text-sm font-bold uppercase tracking-widest text-foreground">
              InfoTech
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
              Gamer
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Search */}
        <form
          onSubmit={handleSearch}
          className="relative hidden flex-1 md:flex md:max-w-sm lg:max-w-md"
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search gear..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-border bg-secondary pl-9 text-sm placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20"
          />
        </form>

        <div className="flex flex-1 items-center justify-end gap-1">
          {/* Wishlist */}
          <Button variant="ghost" size="icon" asChild className="relative text-muted-foreground hover:text-primary">
            <Link href="/wishlist">
              <Heart className="h-5 w-5" />
              {wishlistItems.length > 0 && (
                <Badge className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border-0 bg-primary p-0 text-[9px] font-bold text-primary-foreground">
                  {wishlistItems.length}
                </Badge>
              )}
              <span className="sr-only">Wishlist</span>
            </Link>
          </Button>

          {/* Cart */}
          <Button variant="ghost" size="icon" asChild className="relative text-muted-foreground hover:text-primary">
            <Link href="/cart">
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <Badge className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border-0 bg-primary p-0 text-[9px] font-bold text-primary-foreground">
                  {itemCount}
                </Badge>
              )}
              <span className="sr-only">Cart</span>
            </Link>
          </Button>

          {/* User Menu */}
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                  <User className="h-5 w-5" />
                  <span className="sr-only">Account menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 border-border bg-card">
                <div className="px-2 py-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                  {user?.name}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="flex items-center gap-2 text-sm">
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/track-order" className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4" />
                    Track Order
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="flex items-center gap-2 text-sm text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm" asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/account" className="text-xs font-bold uppercase tracking-wider">Sign In</Link>
            </Button>
          )}

          {/* Mobile Menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground md:hidden hover:text-primary">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 border-border bg-card">
              <SheetHeader>
                <SheetTitle className="text-left text-sm font-bold uppercase tracking-widest text-primary">
                  InfoTechGamer
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 flex flex-col gap-4">
                <form onSubmit={(e) => { handleSearch(e); setMobileOpen(false) }}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search gear..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="border-border bg-secondary pl-9"
                    />
                  </div>
                </form>
                <nav className="flex flex-col gap-1">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  ))}
                  <Link
                    href="/wishlist"
                    onClick={() => setMobileOpen(false)}
                    className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary"
                  >
                    WISHLIST
                  </Link>
                  <Link
                    href="/cart"
                    onClick={() => setMobileOpen(false)}
                    className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary"
                  >
                    CART {itemCount > 0 && `(${itemCount})`}
                  </Link>
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
