"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Headphones, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { createSupportTicket } from "@/lib/api"
import { toast } from "sonner"

const supportSchema = z.object({
  email: z.string().email("Invalid email address"),
  subject: z.string().min(3, "Subject must be at least 3 characters"),
  message: z.string().min(10, "Message must be at least 10 characters"),
})

type SupportValues = z.infer<typeof supportSchema>

export default function SupportPage() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SupportValues>({ resolver: zodResolver(supportSchema) })

  async function onSubmit(data: SupportValues) {
    setLoading(true)
    try {
      await createSupportTicket(data)
      setSubmitted(true)
      toast.success("Support ticket created.")
    } catch {
      toast.error("Failed to submit ticket. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle className="h-8 w-8 text-primary" />
        </div>
        <h1 className="mt-6 font-serif text-2xl font-bold text-foreground">Ticket Submitted</h1>
        <p className="mt-2 text-muted-foreground">
          We have received your support request and will respond within 24 hours.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-12">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Headphones className="h-7 w-7 text-primary" />
        </div>
        <h1 className="font-serif text-3xl font-bold text-foreground">Contact Support</h1>
        <p className="mt-2 text-muted-foreground">
          Have a question or issue? We are here to help.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Submit a Ticket</CardTitle>
          <CardDescription>Fill out the form below and our team will get back to you.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="support-email">Email</Label>
              <Input id="support-email" type="email" {...register("email")} className="mt-1" />
              {errors.email && <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="support-subject">Subject</Label>
              <Input id="support-subject" {...register("subject")} className="mt-1" />
              {errors.subject && <p className="mt-1 text-sm text-destructive">{errors.subject.message}</p>}
            </div>
            <div>
              <Label htmlFor="support-message">Message</Label>
              <Textarea
                id="support-message"
                rows={5}
                {...register("message")}
                className="mt-1"
              />
              {errors.message && <p className="mt-1 text-sm text-destructive">{errors.message.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Submitting..." : "Submit Ticket"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
