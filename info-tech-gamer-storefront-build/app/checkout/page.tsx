"use client"

import { useState } from "react"
import Link from "next/link"
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
import { useLocale } from "@/lib/locale-context"
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
  { value: "credit_card", key: "card", icon: CreditCard },
  { value: "pix", key: "pix", icon: QrCode },
  { value: "boleto", key: "boleto", icon: FileText },
] as const

export default function CheckoutPage() {
  const { items, subtotal, clearCart, itemCount } = useCart()
  const { user } = useAuth()
  const { t } = useLocale()
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
    defaultValues: { payment: "credit_card" },
  })

  const selectedPayment = watch("payment")
  const shipping = subtotal >= 99 ? 0 : 9.99
  const total = subtotal + shipping

  if (items.length === 0 && !submitted) {
    return (
      <div className="mx-auto max-w-[1200px] px-6 py-20 text-center">
        <h1 className="text-xl font-black uppercase tracking-wider text-foreground">{t("Cart is Empty", "Carrinho vazio")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("Add some gear before checking out.", "Adicione itens antes de finalizar a compra.")}</p>
        <Button asChild className="mt-6 bg-primary text-sm font-bold uppercase tracking-wider text-primary-foreground">
          <Link href="/#catalog">{t("Browse Catalog", "Ver catálogo")}</Link>
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
        <h1 className="mt-6 text-xl font-black uppercase tracking-wider text-foreground">{t("Order Confirmed", "Pedido confirmado")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("Your order has been placed.", "Seu pedido foi realizado.")}</p>
        <div className="mt-8 flex flex-col gap-3">
          <Button asChild className="bg-primary text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90">
            <Link href="/track-order">{t("Track Your Order", "Rastrear pedido")}</Link>
          </Button>
          <Button variant="outline" asChild className="border-border text-sm font-bold uppercase tracking-wider text-muted-foreground hover:border-primary hover:text-primary">
            <Link href="/">{t("Continue Shopping", "Continuar comprando")}</Link>
          </Button>
        </div>
      </div>
    )
  }

  async function onSubmit() {
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
      toast.success(t("Order placed successfully!", "Pedido realizado com sucesso!"))
    } catch (error) {
      toast.error(t("Failed to place the order.", "Falha ao finalizar pedido."))
      console.error("checkout_error", error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12">
      <div className="mb-8 flex items-center gap-3">
        <div className="h-6 w-1 bg-primary" />
        <h1 className="text-lg font-black uppercase tracking-wider text-foreground">{t("Checkout", "Checkout")}</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground">{t("Shipping Address", "Endereço de entrega")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("Full Name", "Nome completo")}</Label>
                  <Input id="name" {...register("name")} className="mt-1 border-border bg-secondary" />
                  {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div>
                  <Label htmlFor="street" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("Street Address", "Rua e número")}</Label>
                  <Input id="street" {...register("street")} className="mt-1 border-border bg-secondary" />
                  {errors.street && <p className="mt-1 text-xs text-destructive">{errors.street.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="city" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("City", "Cidade")}</Label>
                    <Input id="city" {...register("city")} className="mt-1 border-border bg-secondary" />
                    {errors.city && <p className="mt-1 text-xs text-destructive">{errors.city.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="state" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("State", "Estado")}</Label>
                    <Input id="state" {...register("state")} className="mt-1 border-border bg-secondary" />
                    {errors.state && <p className="mt-1 text-xs text-destructive">{errors.state.message}</p>}
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <Label htmlFor="zip" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("ZIP Code", "CEP")}</Label>
                    <Input id="zip" {...register("zip")} className="mt-1 border-border bg-secondary" />
                    {errors.zip && <p className="mt-1 text-xs text-destructive">{errors.zip.message}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground">{t("Payment Method", "Método de pagamento")}</CardTitle>
              </CardHeader>
              <CardContent>
                <input type="hidden" {...register("payment")} />
                <RadioGroup
                  value={selectedPayment}
                  onValueChange={(v) => setValue("payment", v as CheckoutFormValues["payment"], { shouldDirty: true, shouldValidate: true })}
                  className="space-y-3"
                >
                  {paymentMethods.map((method) => {
                    const label = method.key === "card" ? t("Credit Card", "Cartão") : method.key === "pix" ? "PIX" : "Boleto"
                    return (
                      <button
                        type="button"
                        key={method.value}
                        className={`flex w-full items-center gap-3 border p-4 text-left transition-colors ${
                          selectedPayment === method.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                        }`}
                        onClick={() => setValue("payment", method.value, { shouldDirty: true, shouldValidate: true })}
                      >
                        <RadioGroupItem value={method.value} id={method.value} />
                        <method.icon className="h-5 w-5 text-muted-foreground" />
                        <Label htmlFor={method.value} className="cursor-pointer text-sm font-bold uppercase tracking-wider text-foreground">
                          {label}
                        </Label>
                      </button>
                    )
                  })}
                </RadioGroup>
              </CardContent>
            </Card>
          </div>

          <Card className="h-fit border-border bg-card">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground">{t("Order Summary", "Resumo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item) => (
                <div key={item.product.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.product.name} x{item.quantity}</span>
                  <span className="font-mono text-foreground">${(item.product.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <Separator className="bg-border" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("Subtotal", "Subtotal")} ({itemCount})</span>
                <span className="font-mono text-foreground">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("Shipping", "Frete")}</span>
                <span className="font-mono text-foreground">{shipping === 0 ? t("Free", "Grátis") : `$${shipping.toFixed(2)}`}</span>
              </div>
              <Separator className="bg-border" />
              <div className="flex justify-between font-bold">
                <span className="text-foreground">{t("Total", "Total")}</span>
                <span className="font-mono text-primary">${total.toFixed(2)}</span>
              </div>
              <Button type="submit" className="w-full bg-primary text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 hover:glow-cyan-sm" size="lg" disabled={isProcessing}>
                {isProcessing ? t("Processing...", "Processando...") : t("Place Order", "Finalizar pedido")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  )
}
