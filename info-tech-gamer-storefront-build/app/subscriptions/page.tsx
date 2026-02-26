"use client"

import { useEffect, useMemo, useState } from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getSubscriptionPlans, subscribe } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import type { SubscriptionPlan } from "@/lib/types"
import { toast } from "sonner"

export default function SubscriptionsPage() {
  const { user } = useAuth()
  const [subscribing, setSubscribing] = useState<string | null>(null)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)

  useEffect(() => {
    getSubscriptionPlans()
      .then(setPlans)
      .catch(() => {
        toast.error("Failed to load plans.")
        setPlans([])
      })
      .finally(() => setLoadingPlans(false))
  }, [])

  const hasPlans = useMemo(() => plans.length > 0, [plans])

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

      {loadingPlans ? (
        <div className="grid gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="relative flex flex-col border-border bg-card">
              <CardHeader className="text-center">
                <div className="mx-auto h-5 w-24 animate-pulse rounded bg-secondary" />
                <div className="mx-auto mt-3 h-8 w-28 animate-pulse rounded bg-secondary" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-4 animate-pulse rounded bg-secondary" />
                <div className="h-4 animate-pulse rounded bg-secondary" />
                <div className="h-4 animate-pulse rounded bg-secondary" />
                <div className="mt-6 h-10 animate-pulse rounded bg-secondary" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !hasPlans ? (
        <div className="py-16 text-center">
          <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">No plans available.</p>
          <p className="mt-1 text-xs text-muted-foreground">Please try again later.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
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
      )}
    </div>
  )
}
