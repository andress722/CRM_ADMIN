"use client"

import Link from "next/link"
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useCart } from "@/lib/cart-context"
import { useLocale } from "@/lib/locale-context"

export default function CartPage() {
  const { items, removeItem, updateQuantity, subtotal, itemCount } = useCart()
  const { t } = useLocale()

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-[1200px] px-6 py-20 text-center">
        <ShoppingBag className="mx-auto h-16 w-16 text-muted-foreground/30" />
        <h1 className="mt-4 text-xl font-black uppercase tracking-wider text-foreground">{t("Cart is Empty", "Carrinho vazio")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("Explore the catalog and add some gear.", "Explore o catálogo e adicione produtos.")}</p>
        <Button asChild className="mt-6 bg-primary text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90">
          <Link href="/#catalog">{t("Browse Catalog", "Ver catálogo")}</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12">
      <div className="mb-8 flex items-center gap-3">
        <div className="h-6 w-1 bg-primary" />
        <h1 className="text-lg font-black uppercase tracking-wider text-foreground">{t("Shopping Cart", "Carrinho")}</h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {items.map((item) => (
            <Card key={item.product.id} className="overflow-hidden border-border bg-card">
              <CardContent className="flex gap-4 p-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden border border-border bg-secondary">
                  {item.product.imageUrl ? (
                    <img src={item.product.imageUrl} alt={item.product.name} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {item.product.category}
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <Link href={`/product?id=${item.product.id}`} className="text-sm font-bold text-foreground transition-colors hover:text-primary">
                      {item.product.name}
                    </Link>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">${item.product.price.toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 border border-border bg-secondary p-0.5">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center font-mono text-xs font-bold text-foreground">{item.quantity}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => updateQuantity(item.product.id, item.quantity + 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-foreground">${(item.product.price * item.quantity).toFixed(2)}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeItem(item.product.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="h-fit border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground">{t("Order Summary", "Resumo do pedido")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("Items", "Itens")} ({itemCount})</span>
              <span className="font-mono text-foreground">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("Shipping", "Frete")}</span>
              <span className="font-mono text-foreground">{subtotal >= 99 ? t("Free", "Grátis") : "$9.99"}</span>
            </div>
            <Separator className="bg-border" />
            <div className="flex justify-between font-bold">
              <span className="text-foreground">{t("Total", "Total")}</span>
              <span className="font-mono text-primary">${(subtotal + (subtotal >= 99 ? 0 : 9.99)).toFixed(2)}</span>
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full bg-primary text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 hover:glow-cyan-sm" size="lg">
              <Link href="/checkout">{t("Proceed to Checkout", "Ir para checkout")}</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
