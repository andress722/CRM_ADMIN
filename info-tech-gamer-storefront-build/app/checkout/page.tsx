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
import { Separator } from "@/components/ui/separator"
import { useCart } from "@/lib/cart-context"
import { useAuth } from "@/lib/auth-context"
import { useLocale } from "@/lib/locale-context"
import { clearTokens, createOrderFromCart, createTransparentCheckout, validateCoupon } from "@/lib/api"
import type { CouponValidation } from "@/lib/types"
import { toast } from "sonner"

type MercadoPagoWindow = Window & {
  MercadoPago?: new (publicKey: string, options?: { locale?: string }) => {
    getPaymentMethods: (params: { bin: string }) => Promise<{ results?: Array<{ id?: string }> }>
    createCardToken: (params: {
      cardNumber: string
      cardholderName: string
      cardExpirationMonth: string
      cardExpirationYear: string
      securityCode: string
      identificationType: string
      identificationNumber: string
    }) => Promise<{ id?: string; payment_method_id?: string }>
  }
}

const checkoutSchema = z.object({
  name: z.string().min(2, "Name is required"),
  street: z.string().min(5, "Street address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  zip: z.string().min(5, "ZIP code is required"),
  cpf: z.string().min(11, "CPF is required"),
  phoneAreaCode: z.string().min(2, "Area code is required"),
  phoneNumber: z.string().min(8, "Phone number is required"),
  payment: z.enum(["credit_card", "pix", "boleto"]),
  cardHolderName: z.string().optional(),
  cardNumber: z.string().optional(),
  cardExpMonth: z.string().optional(),
  cardExpYear: z.string().optional(),
  cardCvv: z.string().optional(),
  cardInstallments: z.string().optional(),
})

type CheckoutFormValues = z.infer<typeof checkoutSchema>

type TransparentResult = {
  method: "pix" | "boleto"
  pixQrCode?: string
  boletoUrl?: string
}

const paymentMethods = [
  { value: "credit_card", key: "card", icon: CreditCard },
  { value: "pix", key: "pix", icon: QrCode },
  { value: "boleto", key: "boleto", icon: FileText },
] as const

const onlyDigits = (value: string) => value.replace(/\D/g, "")
const MP_SDK_URL = "https://sdk.mercadopago.com/js/v2"
const MP_PUBLIC_KEY = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY || process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || ""

let mpSdkPromise: Promise<void> | null = null

function ensureMercadoPagoSdkLoaded(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  if ((window as MercadoPagoWindow).MercadoPago) return Promise.resolve()
  if (mpSdkPromise) return mpSdkPromise

  mpSdkPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src=\"${MP_SDK_URL}\"]`)
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true })
      existing.addEventListener("error", () => reject(new Error("Failed to load Mercado Pago SDK")), { once: true })
      return
    }

    const script = document.createElement("script")
    script.src = MP_SDK_URL
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load Mercado Pago SDK"))
    document.head.appendChild(script)
  })

  return mpSdkPromise
}

async function tokenizeCard(values: CheckoutFormValues): Promise<{ token: string; paymentMethodId: string; installments: number }> {
  if (!MP_PUBLIC_KEY) {
    throw new Error("Missing NEXT_PUBLIC_MP_PUBLIC_KEY")
  }

  await ensureMercadoPagoSdkLoaded()

  const mpCtor = (window as MercadoPagoWindow).MercadoPago
  if (!mpCtor) {
    throw new Error("Mercado Pago SDK unavailable")
  }

  const cardNumber = onlyDigits(values.cardNumber ?? "")
  const cardholderName = (values.cardHolderName ?? "").trim()
  const cardExpirationMonth = onlyDigits(values.cardExpMonth ?? "")
  const cardExpirationYear = onlyDigits(values.cardExpYear ?? "")
  const securityCode = onlyDigits(values.cardCvv ?? "")
  const cpf = onlyDigits(values.cpf)

  if (cardNumber.length < 13 || cardNumber.length > 19) throw new Error("Invalid card number")
  if (!cardholderName) throw new Error("Card holder name is required")
  if (cardExpirationMonth.length !== 2) throw new Error("Invalid expiration month")
  if (cardExpirationYear.length !== 4) throw new Error("Invalid expiration year")
  if (securityCode.length < 3 || securityCode.length > 4) throw new Error("Invalid CVV")

  const mp = new mpCtor(MP_PUBLIC_KEY, { locale: "pt-BR" })

  const bin = cardNumber.slice(0, 6)
  const methods = await mp.getPaymentMethods({ bin })
  let paymentMethodId = methods?.results?.[0]?.id || ""

  const tokenResponse = await mp.createCardToken({
    cardNumber,
    cardholderName,
    cardExpirationMonth,
    cardExpirationYear,
    securityCode,
    identificationType: "CPF",
    identificationNumber: cpf,
  })

  const token = tokenResponse?.id || ""
  if (!token) throw new Error("Failed to tokenize card")

  if (!paymentMethodId) {
    paymentMethodId = tokenResponse?.payment_method_id || ""
  }

  if (!paymentMethodId) {
    throw new Error("Unable to resolve card payment method")
  }

  const installments = Math.max(1, Number(values.cardInstallments || "1") || 1)
  return { token, paymentMethodId, installments }
}

export default function CheckoutPage() {
  const router = useRouter()
  const { items, subtotal, clearCart, itemCount } = useCart()
  const { user, isAuthenticated } = useAuth()
  const { t } = useLocale()
  const [submitted, setSubmitted] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [couponCode, setCouponCode] = useState("")
  const [couponLoading, setCouponLoading] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidation | null>(null)
  const [transparentResult, setTransparentResult] = useState<TransparentResult | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { payment: "credit_card", cardInstallments: "1" },
  })

  const selectedPayment = watch("payment")
  const shipping = subtotal >= 99 ? 0 : 9.99
  const rawTotal = subtotal + shipping
  const discountValue = appliedCoupon ? (rawTotal * appliedCoupon.discount) / 100 : 0
  const total = Math.max(rawTotal - discountValue, 0)

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

        {transparentResult?.method === "pix" && transparentResult.pixQrCode && (
          <div className="mt-6 rounded border border-emerald-600/30 bg-emerald-500/10 p-4 text-left">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">PIX</p>
            <p className="mt-2 break-all font-mono text-xs text-emerald-200">{transparentResult.pixQrCode}</p>
          </div>
        )}

        {transparentResult?.method === "boleto" && transparentResult.boletoUrl && (
          <div className="mt-6 rounded border border-amber-600/30 bg-amber-500/10 p-4 text-left">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Boleto</p>
            <a
              href={transparentResult.boletoUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-xs font-semibold text-amber-200 underline"
            >
              {t("Open boleto", "Abrir boleto")}
            </a>
          </div>
        )}

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

  const getErrorMessage = (error: unknown): string => {
    if (!error || typeof error !== "object") return t("Unknown error", "Erro desconhecido")
    const e = error as { message?: string }
    return e.message || t("Unknown error", "Erro desconhecido")
  }

  const applyCoupon = async () => {
    const normalized = couponCode.trim().toUpperCase()
    if (!normalized) {
      toast.error(t("Enter a coupon code", "Digite um cupom"))
      return
    }

    setCouponLoading(true)
    try {
      const validated = await validateCoupon(normalized)
      setCouponCode(normalized)
      setAppliedCoupon(validated)
      toast.success(t("Coupon applied", "Cupom aplicado"))
    } catch (error) {
      setAppliedCoupon(null)
      toast.error(`${t("Invalid coupon", "Cupom inválido")}: ${getErrorMessage(error)}`)
    } finally {
      setCouponLoading(false)
    }
  }

  async function onSubmit(values: CheckoutFormValues) {
    if (!isAuthenticated) {
      toast.error(t("Please sign in before checkout.", "Faça login antes de finalizar."))
      router.push("/account?returnTo=/checkout")
      return
    }

    setIsProcessing(true)
    setTransparentResult(null)
    try {
      const order = await createOrderFromCart(appliedCoupon?.code)
      const [firstName, ...lastNameParts] = values.name.trim().split(" ")
      const lastName = lastNameParts.join(" ").trim() || "Cliente"

      if (values.payment === "credit_card") {
        const card = await tokenizeCard(values)
        await createTransparentCheckout({
          orderId: order.id,
          method: "card",
          amount: order.totalAmount,
          paymentMethodId: card.paymentMethodId,
          payer: {
            email: user?.email || "buyer@example.com",
            firstName: firstName || "Cliente",
            lastName,
            identificationType: "CPF",
            identificationNumber: onlyDigits(values.cpf),
            phoneAreaCode: onlyDigits(values.phoneAreaCode),
            phoneNumber: onlyDigits(values.phoneNumber),
          },
          card: {
            token: card.token,
            installments: card.installments,
            paymentMethodId: card.paymentMethodId,
          },
        })
      } else {
        const method = values.payment === "pix" ? "pix" : "boleto"
        const result = await createTransparentCheckout({
          orderId: order.id,
          method,
          amount: order.totalAmount,
          paymentMethodId: method === "pix" ? "pix" : "bolbradesco",
          payer: {
            email: user?.email || "buyer@example.com",
            firstName: firstName || "Cliente",
            lastName,
            identificationType: "CPF",
            identificationNumber: onlyDigits(values.cpf),
            phoneAreaCode: onlyDigits(values.phoneAreaCode),
            phoneNumber: onlyDigits(values.phoneNumber),
          },
        })

        setTransparentResult({
          method,
          pixQrCode: result.pixQrCode,
          boletoUrl: result.boletoUrl,
        })
      }

      clearCart()
      setSubmitted(true)
      toast.success(t("Order placed successfully!", "Pedido realizado com sucesso!"))
    } catch (error) {
      const message = getErrorMessage(error)
      const normalized = message.toLowerCase()

      if (normalized.includes("session expired") || normalized.includes("unauthorized") || normalized.includes("user not found") || normalized.includes("401")) {
        clearTokens()
        toast.error(t("Session expired. Please sign in again.", "Sessao expirada. Faca login novamente."))
        router.push("/account?returnTo=/checkout")
        return
      }

      toast.error(`${t("Failed to place the order.", "Falha ao finalizar pedido.")} ${message}`)
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

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="cpf" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">CPF</Label>
                    <Input id="cpf" {...register("cpf")} className="mt-1 border-border bg-secondary" />
                    {errors.cpf && <p className="mt-1 text-xs text-destructive">{errors.cpf.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="phoneAreaCode" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">DDD</Label>
                    <Input id="phoneAreaCode" {...register("phoneAreaCode")} className="mt-1 border-border bg-secondary" />
                    {errors.phoneAreaCode && <p className="mt-1 text-xs text-destructive">{errors.phoneAreaCode.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="phoneNumber" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("Phone", "Telefone")}</Label>
                    <Input id="phoneNumber" {...register("phoneNumber")} className="mt-1 border-border bg-secondary" />
                    {errors.phoneNumber && <p className="mt-1 text-xs text-destructive">{errors.phoneNumber.message}</p>}
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
                <div className="space-y-3">
                  {paymentMethods.map((method) => {
                    const label = method.key === "card" ? t("Credit Card", "Cartão") : method.key === "pix" ? "PIX" : "Boleto"
                    const isSelected = selectedPayment === method.value
                    return (
                      <button
                        type="button"
                        key={method.value}
                        aria-pressed={isSelected}
                        className={`flex w-full items-center gap-3 border p-4 text-left transition-colors ${
                          isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                        }`}
                        onClick={() => setValue("payment", method.value, { shouldDirty: true, shouldValidate: true })}
                      >
                        <div
                          className={`h-4 w-4 rounded-full border ${
                            isSelected ? "border-primary" : "border-muted-foreground/40"
                          }`}
                        >
                          <div className={`m-[3px] h-2 w-2 rounded-full ${isSelected ? "bg-primary" : "bg-transparent"}`} />
                        </div>
                        <method.icon className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm font-bold uppercase tracking-wider text-foreground">{label}</span>
                      </button>
                    )
                  })}
                </div>

                {selectedPayment === "credit_card" && (
                  <div className="mt-4 grid gap-4 rounded-lg border border-border p-4">
                    <div>
                      <Label htmlFor="cardHolderName" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("Card Holder", "Nome no cartão")}</Label>
                      <Input id="cardHolderName" {...register("cardHolderName")} className="mt-1 border-border bg-secondary" />
                    </div>
                    <div>
                      <Label htmlFor="cardNumber" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("Card Number", "Número do cartão")}</Label>
                      <Input id="cardNumber" {...register("cardNumber")} className="mt-1 border-border bg-secondary" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label htmlFor="cardExpMonth" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("Month", "Mês")}</Label>
                        <Input id="cardExpMonth" placeholder="MM" {...register("cardExpMonth")} className="mt-1 border-border bg-secondary" />
                      </div>
                      <div>
                        <Label htmlFor="cardExpYear" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("Year", "Ano")}</Label>
                        <Input id="cardExpYear" placeholder="YYYY" {...register("cardExpYear")} className="mt-1 border-border bg-secondary" />
                      </div>
                      <div>
                        <Label htmlFor="cardCvv" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">CVV</Label>
                        <Input id="cardCvv" {...register("cardCvv")} className="mt-1 border-border bg-secondary" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="cardInstallments" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("Installments", "Parcelas")}</Label>
                      <select id="cardInstallments" {...register("cardInstallments")} className="mt-1 w-full border border-border bg-secondary p-2 text-sm text-foreground">
                        <option value="1">1x</option>
                        <option value="2">2x</option>
                        <option value="3">3x</option>
                        <option value="6">6x</option>
                        <option value="12">12x</option>
                      </select>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{t("Payment is processed transparently without leaving this page.", "Pagamento processado de forma transparente sem sair desta página.")}</p>
                  </div>
                )}
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

              <div className="space-y-2 rounded-lg border border-border p-3">
                <Label htmlFor="coupon" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("Coupon", "Cupom")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="coupon"
                    value={couponCode}
                    onChange={(e) => {
                      const nextValue = e.target.value.toUpperCase()
                      setCouponCode(nextValue)
                      if (appliedCoupon && appliedCoupon.code !== nextValue.trim()) {
                        setAppliedCoupon(null)
                      }
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void applyCoupon(); } }}
                    className="border-border bg-secondary"
                  />
                  <Button type="button" variant="outline" onClick={applyCoupon} disabled={couponLoading} className="border-border">
                    {couponLoading ? t("Applying...", "Aplicando...") : t("Apply", "Aplicar")}
                  </Button>
                </div>
                {appliedCoupon && (
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-emerald-400">{t("Discount", "Desconto")}: {appliedCoupon.discount}%</p>
                    <button
                      type="button"
                      onClick={() => {
                        setAppliedCoupon(null)
                        setCouponCode("")
                      }}
                      className="text-xs text-slate-400 underline hover:text-slate-200"
                    >
                      {t("Remove", "Remover")}
                    </button>
                  </div>
                )}
              </div>

              <Separator className="bg-border" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("Subtotal", "Subtotal")} ({itemCount})</span>
                <span className="font-mono text-foreground">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("Shipping", "Frete")}</span>
                <span className="font-mono text-foreground">{shipping === 0 ? t("Free", "Grátis") : `$${shipping.toFixed(2)}`}</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t("Discount", "Desconto")} ({appliedCoupon.code})</span>
                  <span className="font-mono text-emerald-400">- ${discountValue.toFixed(2)}</span>
                </div>
              )}
              <Separator className="bg-border" />
              <div className="flex justify-between font-bold">
                <span className="text-foreground">{t("Total", "Total")}</span>
                <span className="font-mono text-primary">${total.toFixed(2)}</span>
              </div>
              {!isAuthenticated && (
                <p className="text-xs text-amber-400">{t("You need to sign in to complete checkout.", "Voce precisa estar logado para finalizar o pedido.")}</p>
              )}
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
