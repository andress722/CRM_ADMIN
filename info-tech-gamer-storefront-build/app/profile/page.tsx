"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "@/lib/auth-context"
import { useLocale } from "@/lib/locale-context"
import { getMe, updateMe, getMyOrders, getMyAddresses, createAddress } from "@/lib/api"
import type { User, Order, Address } from "@/lib/types"
import { toast } from "sonner"

const profileSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
})

const addressSchema = z.object({
  label: z.string().min(2, "Label is required"),
  recipientName: z.string().min(2, "Name is required"),
  phone: z.string().min(6, "Phone is required"),
  street: z.string().min(5, "Street is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  zip: z.string().min(5, "ZIP is required"),
  country: z.string().min(2, "Country is required"),
})

type ProfileValues = z.infer<typeof profileSchema>
type AddressValues = z.infer<typeof addressSchema>

function ProfileContent() {
  const { refreshUser } = useAuth()
  const { t } = useLocale()
  const [orders, setOrders] = useState<Order[]>([])
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingAddress, setSavingAddress] = useState(false)

  const profileForm = useForm<ProfileValues>({ resolver: zodResolver(profileSchema) })
  const addressForm = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: { country: "Brasil", label: "Casa" },
  })

  useEffect(() => {
    Promise.all([getMe(), getMyOrders(), getMyAddresses()])
      .then(([me, ord, addr]) => {
        setOrders(ord)
        setAddresses(addr)
        profileForm.reset({ name: me.name, email: me.email, phone: me.phone || "" })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [profileForm])

  async function onSaveProfile(data: ProfileValues) {
    setSaving(true)
    try {
      await updateMe(data)
      await refreshUser()
      toast.success(t("Profile updated successfully.", "Perfil atualizado com sucesso."))
    } catch {
      toast.error(t("Failed to update profile.", "Falha ao atualizar perfil."))
    } finally {
      setSaving(false)
    }
  }

  async function onCreateAddress(data: AddressValues) {
    setSavingAddress(true)
    try {
      const created = await createAddress({ ...data, isDefault: addresses.length === 0 })
      setAddresses((prev) => [...prev, created])
      addressForm.reset({ country: data.country, label: data.label })
      toast.success(t("Address added.", "Endereço adicionado."))
    } catch {
      toast.error(t("Failed to add address.", "Falha ao adicionar endereço."))
    } finally {
      setSavingAddress(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1200px] px-6 py-12">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-6 h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12">
      <h1 className="mb-8 font-serif text-3xl font-bold text-foreground">{t("My Profile", "Meu Perfil")}</h1>

      <Tabs defaultValue="personal" className="w-full">
        <TabsList>
          <TabsTrigger value="personal">{t("Personal Data", "Dados Pessoais")}</TabsTrigger>
          <TabsTrigger value="addresses">{t("Addresses", "Endereços")}</TabsTrigger>
          <TabsTrigger value="orders">{t("Order History", "Histórico")}</TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-lg">{t("Personal Information", "Informações pessoais")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4 max-w-md">
                <div>
                  <Label htmlFor="profile-name">{t("Full Name", "Nome completo")}</Label>
                  <Input id="profile-name" {...profileForm.register("name")} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="profile-email">Email</Label>
                  <Input id="profile-email" type="email" {...profileForm.register("email")} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="profile-phone">{t("Phone", "Telefone")}</Label>
                  <Input id="profile-phone" {...profileForm.register("phone")} className="mt-1" />
                </div>
                <Button type="submit" disabled={saving}>{saving ? t("Saving...", "Salvando...") : t("Save Changes", "Salvar alterações")}</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="addresses">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-lg">{t("Add Address", "Adicionar endereço")}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={addressForm.handleSubmit(onCreateAddress)} className="space-y-3">
                  <Input placeholder={t("Label (Home, Work)", "Rótulo (Casa, Trabalho)")} {...addressForm.register("label")} />
                  <Input placeholder={t("Recipient name", "Nome do destinatário")} {...addressForm.register("recipientName")} />
                  <Input placeholder={t("Phone", "Telefone")} {...addressForm.register("phone")} />
                  <Input placeholder={t("Street and number", "Rua e número")} {...addressForm.register("street")} />
                  <div className="grid grid-cols-3 gap-2">
                    <Input placeholder={t("City", "Cidade")} {...addressForm.register("city")} />
                    <Input placeholder={t("State", "Estado")} {...addressForm.register("state")} />
                    <Input placeholder={t("ZIP", "CEP")} {...addressForm.register("zip")} />
                  </div>
                  <Input placeholder={t("Country", "País")} {...addressForm.register("country")} />
                  <Button type="submit" disabled={savingAddress}>{savingAddress ? t("Saving...", "Salvando...") : t("Add Address", "Adicionar endereço")}</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-serif text-lg">{t("Saved Addresses", "Endereços salvos")}</CardTitle>
              </CardHeader>
              <CardContent>
                {addresses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("No saved addresses yet.", "Nenhum endereço salvo ainda.")}</p>
                ) : (
                  <div className="space-y-4">
                    {addresses.map((addr) => (
                      <div key={addr.id} className="flex items-start justify-between rounded-lg border border-border p-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">{addr.label}</span>
                            {addr.isDefault && <Badge variant="secondary" className="text-xs">{t("Default", "Padrão")}</Badge>}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{addr.street}, {addr.city}, {addr.state} {addr.zip}</p>
                          <p className="text-sm text-muted-foreground">{addr.country}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-lg">{t("Order History", "Histórico de pedidos")}</CardTitle>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("No orders yet.", "Nenhum pedido ainda.")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("Order ID", "Pedido")}</TableHead>
                        <TableHead>{t("Date", "Data")}</TableHead>
                        <TableHead>{t("Total", "Total")}</TableHead>
                        <TableHead>{t("Status", "Status")}</TableHead>
                        <TableHead className="text-right">{t("Actions", "Ações")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.id}</TableCell>
                          <TableCell>{order.date}</TableCell>
                          <TableCell>${order.total?.toFixed(2)}</TableCell>
                          <TableCell><Badge variant="secondary">{order.status}</Badge></TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href="/track-order">{t("Track", "Rastrear")}</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  )
}
