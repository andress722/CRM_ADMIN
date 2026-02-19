"use client"

import { useState } from "react"
import { Bug } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface MockPaymentResponse {
  status: string
  transactionId: string
  method: string
  amount: string
  timestamp: string
}

export default function DebugPaymentPage() {
  const [amount, setAmount] = useState("99.99")
  const [method, setMethod] = useState("credit_card")
  const [response, setResponse] = useState<MockPaymentResponse | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    // Simulate payment processing
    await new Promise((r) => setTimeout(r, 1000))
    setResponse({
      status: "approved",
      transactionId: `TXN-${Date.now()}`,
      method,
      amount,
      timestamp: new Date().toISOString(),
    })
    setLoading(false)
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-12">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <Bug className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">Debug Payment</h1>
          <p className="text-sm text-muted-foreground">Development-only payment testing tool.</p>
        </div>
      </div>

      <Badge variant="secondary" className="mb-6">DEV ONLY</Badge>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Mock Payment Form</CardTitle>
          <CardDescription>Test payment processing without real transactions.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="debug-amount">Amount ($)</Label>
              <Input
                id="debug-amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Processing..." : "Process Mock Payment"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {response && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="font-serif text-lg">Response</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm text-foreground">
              {JSON.stringify(response, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
