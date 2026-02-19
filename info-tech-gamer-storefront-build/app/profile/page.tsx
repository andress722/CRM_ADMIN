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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "@/lib/auth-context"
import { getMe, updateMe, getMyOrders, getMyAddresses } from "@/lib/api"
import type { User, Order, Address } from "@/lib/types"
import { toast } from "sonner"

const profileSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
})

type ProfileValues = z.infer<typeof profileSchema>

function ProfileContent() {
  const { refreshUser } = useAuth()
  const [userData, setUserData] = useState<User | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileValues>({ resolver: zodResolver(profileSchema) })

  useEffect(() => {
    Promise.all([getMe(), getMyOrders(), getMyAddresses()])
      .then(([me, ord, addr]) => {
        setUserData(me)
        setOrders(ord)
        setAddresses(addr)
        reset({ name: me.name, email: me.email, phone: me.phone || "" })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [reset])

  async function onSave(data: ProfileValues) {
    setSaving(true)
    try {
      const updated = await updateMe(data)
      setUserData(updated)
      await refreshUser()
      toast.success("Profile updated successfully.")
    } catch {
      toast.error("Failed to update profile.")
    } finally {
      setSaving(false)
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
      <h1 className="mb-8 font-serif text-3xl font-bold text-foreground">My Profile</h1>

      <Tabs defaultValue="personal" className="w-full">
        <TabsList>
          <TabsTrigger value="personal">Personal Data</TabsTrigger>
          <TabsTrigger value="addresses">Addresses</TabsTrigger>
          <TabsTrigger value="orders">Order History</TabsTrigger>
        </TabsList>

        {/* Personal Data */}
        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-lg">Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSave)} className="space-y-4 max-w-md">
                <div>
                  <Label htmlFor="profile-name">Full Name</Label>
                  <Input id="profile-name" {...register("name")} className="mt-1" />
                  {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>}
                </div>
                <div>
                  <Label htmlFor="profile-email">Email</Label>
                  <Input id="profile-email" type="email" {...register("email")} className="mt-1" />
                  {errors.email && <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>}
                </div>
                <div>
                  <Label htmlFor="profile-phone">Phone</Label>
                  <Input id="profile-phone" {...register("phone")} className="mt-1" />
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Addresses */}
        <TabsContent value="addresses">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-lg">Saved Addresses</CardTitle>
            </CardHeader>
            <CardContent>
              {addresses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No saved addresses yet.</p>
              ) : (
                <div className="space-y-4">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className="flex items-start justify-between rounded-lg border border-border p-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{addr.label}</span>
                          {addr.isDefault && (
                            <Badge variant="secondary" className="text-xs">Default</Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {addr.street}, {addr.city}, {addr.state} {addr.zip}
                        </p>
                        <p className="text-sm text-muted-foreground">{addr.country}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Order History */}
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-lg">Order History</CardTitle>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No orders yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.id}</TableCell>
                          <TableCell>{order.date}</TableCell>
                          <TableCell>${order.total?.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{order.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href="/track-order">Track</Link>
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
