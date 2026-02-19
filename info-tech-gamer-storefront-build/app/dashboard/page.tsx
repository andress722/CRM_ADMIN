"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ShoppingBag, DollarSign, Heart, MessageSquare, User, Package, Headphones } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatsCard } from "@/components/stats-card"
import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "@/lib/auth-context"
import { getMyStats, getMyOrders } from "@/lib/api"
import type { UserStats, Order } from "@/lib/types"

function DashboardContent() {
  const { user } = useAuth()
  const [stats, setStats] = useState<UserStats | null>(null)
  const [lastOrder, setLastOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getMyStats(), getMyOrders()])
      .then(([s, orders]) => {
        setStats(s)
        if (orders.length > 0) setLastOrder(orders[0])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="mx-auto max-w-[1200px] px-6 py-12">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-border bg-card">
              <CardContent className="p-5">
                <div className="h-12 w-full animate-pulse bg-secondary" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-black uppercase tracking-wider text-foreground">
          Welcome, {user?.name?.split(" ")[0] || "Gamer"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Your account activity overview.</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatsCard icon={ShoppingBag} label="ORDERS" value={String(stats.orders)} />
          <StatsCard icon={DollarSign} label="SPENT" value={`$${stats.spent.toFixed(2)}`} />
          <StatsCard icon={Heart} label="FAVORITES" value={String(stats.favorites)} />
          <StatsCard icon={MessageSquare} label="REVIEWS" value={String(stats.reviews)} />
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {lastOrder && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground">Last Order</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-foreground">{lastOrder.id}</span>
                <span className="border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                  {lastOrder.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span className="text-xs">{lastOrder.date}</span>
                <span className="font-mono font-bold text-foreground">
                  ${lastOrder.total?.toFixed(2)}
                </span>
              </div>
              <Button variant="outline" size="sm" asChild className="w-full border-border text-xs font-bold uppercase tracking-wider text-muted-foreground hover:border-primary hover:text-primary">
                <Link href="/track-order">Track Order</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground">Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" asChild className="w-full justify-start gap-2 border-border text-sm text-muted-foreground hover:border-primary hover:text-primary">
              <Link href="/profile">
                <User className="h-4 w-4" /> Profile
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full justify-start gap-2 border-border text-sm text-muted-foreground hover:border-primary hover:text-primary">
              <Link href="/track-order">
                <Package className="h-4 w-4" /> Track Orders
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full justify-start gap-2 border-border text-sm text-muted-foreground hover:border-primary hover:text-primary">
              <Link href="/support">
                <Headphones className="h-4 w-4" /> Support
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}
