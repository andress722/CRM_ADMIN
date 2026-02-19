"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CheckCircle, CreditCard, QrCode, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { useCart } from "@/lib/cart-context"
import { useAuth } from "@/lib/auth-context"
import { createOrderFromCart, createCheckout } from "@/lib/api"
import { toast } from "sonner"

const checkoutSchema = z.object({
  name: z.string().min(2, "Name is required"),
  street: z.string().min(5, "Street address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  zip: z.string().min(5, "ZIP code is required"),
  payment: z.enum(["credit_card", "pix", "boleto"]),
})

type CheckoutFormValues = z.infer<typeof checkoutSchema>

const paymentMethods = [
  { value: "credit_card", label: "Credit Card", icon: CreditCard },
  { value: "pix", label: "PIX", icon: QrCode },
  { value: "boleto", label: "Boleto", icon: FileText },
] as const

export default function CheckoutPage() {
  const router = useRouter()
  const { items, subtotal, clearCart, itemCount } = useCart()
  const { user } = useAuth()
  const [submitted, setSubmitted] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      payment: "credit_card",
    },
  })

  const selectedPayment = watch("payment")
  const shipping = subtotal >= 99 ? 0 : 9.99
  const total = subtotal + shipping

  if (items.length === 0 && !submitted) {
    return (
      <div className="mx-auto max-w-[1200px] px-6 py-20 text-center">
        <h1 className="text-xl font-black uppercase tracking-wider text-foreground">Cart is Empty</h1>
        <p className="mt-2 text-sm text-muted-foreground">Add some gear before checking out.</p>
        <Button asChild className="mt-6 bg-primary text-sm font-bold uppercase tracking-wider text-primary-foreground">
          <Link href="/#catalog">Browse Catalog</Link>
        </Button>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center border border-primary/20 bg-primary/10">
          <CheckCircle className="h-8 w-8 text-primary" />
        </div>
        <h1 className="mt-6 text-xl font-black uppercase tracking-wider text-foreground">Order Confirmed</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your order has been placed. Confirmation email incoming.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Button asChild className="bg-primary text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90">
            <Link href="/track-order">Track Your Order</Link>
          </Button>
          <Button variant="outline" asChild className="border-border text-sm font-bold uppercase tracking-wider text-muted-foreground hover:border-primary hover:text-primary">
            <Link href="/">Continue Shopping</Link>
          </Button>
        </div>
      </div>
    )
  }

  async function onSubmit(data: CheckoutFormValues) {
    setIsProcessing(true)
    try {
      const order = await createOrderFromCart()
      const checkout = await createCheckout(order.id, user?.email)
      const redirectUrl = checkout.initPoint || checkout.sandboxInitPoint
      if (redirectUrl) {
        window.location.href = redirectUrl
        return
      }
      clearCart()
      setSubmitted(true)
      toast.success("Order placed successfully!")
    } catch {
      toast.error("Failed to place the order. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12">
      <div className="mb-8 flex items-center gap-3">
        <div className="h-6 w-1 bg-primary" />
        <h1 className="text-lg font-black uppercase tracking-wider text-foreground">Checkout</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Form */}
          <div className="space-y-6 lg:col-span-2">
            {/* Shipping Address */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground">Shipping Address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name</Label>
                  <Input id="name" {...register("name")} className="mt-1 border-border bg-secondary" />
                  {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div>
                  <Label htmlFor="street" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Street Address</Label>
                  <Input id="street" {...register("street")} className="mt-1 border-border bg-secondary" />
                  {errors.street && <p className="mt-1 text-xs text-destructive">{errors.street.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="city" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">City</Label>
                    <Input id="city" {...register("city")} className="mt-1 border-border bg-secondary" />
                    {errors.city && <p className="mt-1 text-xs text-destructive">{errors.city.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="state" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">State</Label>
                    <Input id="state" {...register("state")} className="mt-1 border-border bg-secondary" />
                    {errors.state && <p className="mt-1 text-xs text-destructive">{errors.state.message}</p>}
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <Label htmlFor="zip" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">ZIP Code</Label>
                    <Input id="zip" {...register("zip")} className="mt-1 border-border bg-secondary" />
                    {errors.zip && <p className="mt-1 text-xs text-destructive">{errors.zip.message}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground">Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={selectedPayment}
                  onValueChange={(v) => setValue("payment", v as CheckoutFormValues["payment"])}
                  className="space-y-3"
                >
                  {paymentMethods.map((method) => (
                    <div
                      key={method.value}
                      className={`flex cursor-pointer items-center gap-3 border p-4 transition-colors ${
                        selectedPayment === method.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      }`}
                      onClick={() => setValue("payment", method.value)}
                    >
                      <RadioGroupItem value={method.value} id={method.value} />
                      <method.icon className="h-5 w-5 text-muted-foreground" />
                      <Label htmlFor={method.value} className="cursor-pointer text-sm font-bold uppercase tracking-wider text-foreground">
                        {method.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <Card className="h-fit border-border bg-card">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item) => (
                <div key={item.product.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.product.name} x{item.quantity}
                  </span>
                  <span className="font-mono text-foreground">
                    ${(item.product.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
              <Separator className="bg-border" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal ({itemCount})</span>
                <span className="font-mono text-foreground">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-mono text-foreground">{shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`}</span>
              </div>
              <Separator className="bg-border" />
              <div className="flex justify-between font-bold">
                <span className="text-foreground">Total</span>
                <span className="font-mono text-primary">${total.toFixed(2)}</span>
              </div>
              <Button type="submit" className="w-full bg-primary text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 hover:glow-cyan-sm" size="lg" disabled={isProcessing}>
                {isProcessing ? "Processing..." : "Place Order"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  )
}
