"use client"

import { useMemo, useState } from "react"
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
import { useLocale } from "@/lib/locale-context"
import { toast } from "sonner"

const buildSupportSchema = (t: (en: string, pt: string) => string) =>
  z.object({
    email: z.string().email(t("Invalid email address", "Email invalido")),
    subject: z.string().min(3, t("Subject must be at least 3 characters", "O assunto deve ter pelo menos 3 caracteres")),
    message: z.string().min(10, t("Message must be at least 10 characters", "A mensagem deve ter pelo menos 10 caracteres")),
  })

type SupportValues = {
  email: string
  subject: string
  message: string
}

export default function SupportPage() {
  const { t } = useLocale()
  const supportSchema = useMemo(() => buildSupportSchema(t), [t])
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
      toast.success(t("Support ticket created.", "Chamado de suporte criado."))
    } catch {
      toast.error(t("Failed to submit ticket. Please try again.", "Falha ao enviar chamado. Tente novamente."))
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
        <h1 className="mt-6 font-serif text-2xl font-bold text-foreground">{t("Ticket Submitted", "Chamado Enviado")}</h1>
        <p className="mt-2 text-muted-foreground">
          {t("We have received your support request and will respond within 24 hours.", "Recebemos sua solicitacao e responderemos em ate 24 horas.")}
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
        <h1 className="font-serif text-3xl font-bold text-foreground">{t("Contact Support", "Contatar Suporte")}</h1>
        <p className="mt-2 text-muted-foreground">
          {t("Have a question or issue? We are here to help.", "Tem alguma duvida ou problema? Estamos aqui para ajudar.")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">{t("Submit a Ticket", "Enviar Chamado")}</CardTitle>
          <CardDescription>{t("Fill out the form below and our team will get back to you.", "Preencha o formulario abaixo e nossa equipe retornara para voce.")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="support-email">{t("Email", "Email")}</Label>
              <Input id="support-email" type="email" {...register("email")} className="mt-1" />
              {errors.email && <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div>
              <Label htmlFor="support-subject">{t("Subject", "Assunto")}</Label>
              <Input id="support-subject" {...register("subject")} className="mt-1" />
              {errors.subject && <p className="mt-1 text-sm text-destructive">{errors.subject.message}</p>}
            </div>
            <div>
              <Label htmlFor="support-message">{t("Message", "Mensagem")}</Label>
              <Textarea
                id="support-message"
                rows={5}
                {...register("message")}
                className="mt-1"
              />
              {errors.message && <p className="mt-1 text-sm text-destructive">{errors.message.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("Submitting...", "Enviando...") : t("Submit Ticket", "Enviar Chamado")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
