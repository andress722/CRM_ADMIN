"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { mockSubscriptionPlans } from "@/lib/mock-data"
import { subscribe } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export default function SubscriptionsPage() {
  const { user } = useAuth()
  const [subscribing, setSubscribing] = useState<string | null>(null)

  async function handleSubscribe(planId: string) {
    if (!user?.email) {
      toast.error("Please sign in to subscribe.")
      return
    }
    setSubscribing(planId)
    try {
      await subscribe(planId, user.email)
      toast.success(`Subscribed to ${planId} plan!`)
    } catch {
      toast.error("Failed to subscribe.")
    } finally {
      setSubscribing(null)
    }
  }

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12">
      <div className="mb-12 text-center">
        <h1 className="text-2xl font-black uppercase tracking-wider text-foreground lg:text-3xl">
          Membership Plans
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Unlock exclusive discounts, free shipping, and priority access.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {mockSubscriptionPlans.map((plan) => (
          <Card
            key={plan.id}
            className={cn(
              "relative flex flex-col border-border bg-card transition-colors",
              plan.highlighted && "border-primary glow-cyan"
            )}
          >
            {plan.highlighted && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                Most Popular
              </Badge>
            )}
            <CardHeader className="text-center">
              <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground">{plan.name}</CardTitle>
              <CardDescription>
                <span className="font-mono text-3xl font-bold text-foreground">${plan.price.toFixed(2)}</span>
                <span className="text-xs text-muted-foreground">/{plan.interval}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
              <ul className="flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className={cn(
                  "mt-6 w-full text-xs font-bold uppercase tracking-wider",
                  plan.highlighted
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:glow-cyan-sm"
                    : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                )}
                variant={plan.highlighted ? "default" : "outline"}
                disabled={subscribing === plan.id}
                onClick={() => handleSubscribe(plan.id)}
              >
                {subscribing === plan.id ? "Subscribing..." : "Get Started"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
