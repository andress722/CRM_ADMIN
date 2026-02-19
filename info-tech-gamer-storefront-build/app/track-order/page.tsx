"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Search, Package, Truck, CheckCircle, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getOrder } from "@/lib/api"
import type { OrderWithHistory } from "@/lib/types"

const trackSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
})

type TrackValues = z.infer<typeof trackSchema>

const statusIcons: Record<string, typeof Package> = {
  "Order Placed": Package,
  "Payment Confirmed": CheckCircle,
  Processing: Clock,
  Shipped: Truck,
  "In Transit": Truck,
  Delivered: CheckCircle,
}

export default function TrackOrderPage() {
  const [order, setOrder] = useState<OrderWithHistory | null>(null)
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TrackValues>({ resolver: zodResolver(trackSchema) })

  async function onSubmit(data: TrackValues) {
    setLoading(true)
    setSearched(true)
    try {
      const result = await getOrder(data.orderId)
      setOrder(result)
    } catch {
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-2 font-serif text-3xl font-bold text-foreground">Track Your Order</h1>
      <p className="mb-8 text-muted-foreground">Enter your order ID to see the current status.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex gap-3">
        <div className="flex-1">
          <Label htmlFor="orderId" className="sr-only">Order ID</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="orderId"
              placeholder="e.g. ORD-20240002"
              {...register("orderId")}
              className="pl-9"
            />
          </div>
          {errors.orderId && <p className="mt-1 text-sm text-destructive">{errors.orderId.message}</p>}
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Searching..." : "Track"}
        </Button>
      </form>

      {searched && !loading && !order && (
        <Card className="mt-8">
          <CardContent className="py-10 text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-lg font-medium text-foreground">Order Not Found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Please check the order ID and try again.
            </p>
          </CardContent>
        </Card>
      )}

      {order && (
        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif text-lg">{order.id}</CardTitle>
              <Badge>{order.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Order Details */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {order.carrier && (
                <div>
                  <span className="text-muted-foreground">Carrier</span>
                  <p className="font-medium text-foreground">{order.carrier}</p>
                </div>
              )}
              {order.estimatedDelivery && (
                <div>
                  <span className="text-muted-foreground">Estimated Delivery</span>
                  <p className="font-medium text-foreground">{order.estimatedDelivery}</p>
                </div>
              )}
            </div>

            {/* Items */}
            {order.items && order.items.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">Items</p>
                <div className="space-y-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="text-foreground">x{item.qty}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline */}
            {order.history && order.history.length > 0 && (
              <div>
                <p className="mb-4 text-sm font-medium text-foreground">Status History</p>
                <div className="relative space-y-6 pl-8">
                  <div className="absolute left-3 top-2 h-[calc(100%-16px)] w-px bg-border" />
                  {order.history.map((entry, i) => {
                    const Icon = statusIcons[entry.status] || Clock
                    const isLatest = i === order.history!.length - 1
                    return (
                      <div key={i} className="relative flex gap-3">
                        <div
                          className={`absolute -left-5 flex h-6 w-6 items-center justify-center rounded-full ${
                            isLatest ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${isLatest ? "text-foreground" : "text-muted-foreground"}`}>
                            {entry.status}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(entry.date).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
