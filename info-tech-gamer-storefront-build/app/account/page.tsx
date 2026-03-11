"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth-context"
import { forgotPassword, resendVerification } from "@/lib/api"
import { useLocale } from "@/lib/locale-context"
import { toast } from "sonner"

const buildLoginSchema = (t: (en: string, pt: string) => string) =>
  z.object({
    email: z.string().email(t("Invalid email", "Email invalido")),
    password: z.string().min(6, t("Password must be at least 6 characters", "A senha deve ter pelo menos 6 caracteres")),
  })

const buildRegisterSchema = (t: (en: string, pt: string) => string) =>
  z.object({
    name: z.string().min(2, t("Name is required", "Nome e obrigatorio")),
    email: z.string().email(t("Invalid email", "Email invalido")),
    password: z.string().min(6, t("Password must be at least 6 characters", "A senha deve ter pelo menos 6 caracteres")),
  })

const buildForgotSchema = (t: (en: string, pt: string) => string) =>
  z.object({
    email: z.string().email(t("Invalid email", "Email invalido")),
  })

type LoginValues = { email: string; password: string }
type RegisterValues = { name: string; email: string; password: string }
type ForgotValues = { email: string }

export default function AccountPage() {
  const router = useRouter()
  const { t } = useLocale()
  const { loginUser, registerUser, isAuthenticated } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard")
    }
  }, [isAuthenticated, router])

  if (isAuthenticated) {
    return null
  }

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center bg-primary">
          <Zap className="h-6 w-6 text-primary-foreground" />
        </div>
        <h1 className="text-xl font-black uppercase tracking-wider text-foreground">{t("Access Your Account", "Acesse Sua Conta")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("Sign in or create a new account.", "Entre ou crie uma nova conta.")}</p>
      </div>

      <Tabs defaultValue="login" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-secondary">
          <TabsTrigger value="login" className="text-xs font-bold uppercase tracking-wider">{t("Sign In", "Entrar")}</TabsTrigger>
          <TabsTrigger value="register" className="text-xs font-bold uppercase tracking-wider">{t("Register", "Cadastrar")}</TabsTrigger>
          <TabsTrigger value="forgot" className="text-xs font-bold uppercase tracking-wider">{t("Forgot", "Recuperar")}</TabsTrigger>
        </TabsList>

        <TabsContent value="login">
          <LoginForm
            isLoading={isLoading}
            onSubmit={async (data) => {
              setIsLoading(true)
              try {
                await loginUser(data.email, data.password)
                toast.success(t("Welcome back!", "Bem-vindo de volta!"))
                window.location.reload()
              } catch {
                toast.error(t("Invalid credentials.", "Credenciais invalidas."))
              } finally {
                setIsLoading(false)
              }
            }}
          />
        </TabsContent>

        <TabsContent value="register">
          <RegisterForm
            isLoading={isLoading}
            onSubmit={async (data) => {
              setIsLoading(true)
              try {
                await registerUser(data.name, data.email, data.password)
                toast.success(t("Account created! Check your email.", "Conta criada! Verifique seu email."))
              } catch {
                toast.error(t("Registration failed.", "Falha no cadastro."))
              } finally {
                setIsLoading(false)
              }
            }}
          />
        </TabsContent>

        <TabsContent value="forgot">
          <ForgotForm isLoading={isLoading} setIsLoading={setIsLoading} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function LoginForm({ isLoading, onSubmit }: { isLoading: boolean; onSubmit: (data: LoginValues) => void }) {
  const { t } = useLocale()
  const loginSchema = useMemo(() => buildLoginSchema(t), [t])
  const { register, handleSubmit, formState: { errors } } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground">{t("Sign In", "Entrar")}</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">{t("Enter your credentials.", "Informe suas credenciais.")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="login-email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("Email", "Email")}</Label>
            <Input id="login-email" type="email" {...register("email")} className="mt-1 border-border bg-secondary" />
            {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div>
            <Label htmlFor="login-password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("Password", "Senha")}</Label>
            <Input id="login-password" type="password" {...register("password")} className="mt-1 border-border bg-secondary" />
            {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <Button type="submit" className="w-full bg-primary text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 hover:glow-cyan-sm" disabled={isLoading}>
            {isLoading ? t("Signing in...", "Entrando...") : t("Sign In", "Entrar")}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function RegisterForm({ isLoading, onSubmit }: { isLoading: boolean; onSubmit: (data: RegisterValues) => void }) {
  const { t } = useLocale()
  const registerSchema = useMemo(() => buildRegisterSchema(t), [t])
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) })

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground">{t("Create Account", "Criar Conta")}</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">{t("Join for exclusive deals and tracking.", "Participe para ofertas exclusivas e rastreio.")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="reg-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("Full Name", "Nome Completo")}</Label>
            <Input id="reg-name" {...register("name")} className="mt-1 border-border bg-secondary" />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="reg-email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("Email", "Email")}</Label>
            <Input id="reg-email" type="email" {...register("email")} className="mt-1 border-border bg-secondary" />
            {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div>
            <Label htmlFor="reg-password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("Password", "Senha")}</Label>
            <Input id="reg-password" type="password" {...register("password")} className="mt-1 border-border bg-secondary" />
            {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <Button type="submit" className="w-full bg-primary text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 hover:glow-cyan-sm" disabled={isLoading}>
            {isLoading ? t("Creating...", "Criando...") : t("Create Account", "Criar Conta")}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function ForgotForm({ isLoading, setIsLoading }: { isLoading: boolean; setIsLoading: (v: boolean) => void }) {
  const { t } = useLocale()
  const forgotSchema = useMemo(() => buildForgotSchema(t), [t])
  const [sent, setSent] = useState(false)
  const { register, handleSubmit, getValues, formState: { errors } } = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema) })

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground">{t("Reset Password", "Redefinir Senha")}</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">{t("Enter your email to receive a reset link.", "Informe seu email para receber o link de redefinicao.")}</CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <div className="space-y-4 text-center">
            <p className="text-xs text-muted-foreground">{t("If the email exists, a reset link has been sent.", "Se o email existir, um link de redefinicao foi enviado.")}</p>
            <Button
              variant="outline"
              className="w-full border-border text-xs font-bold uppercase tracking-wider text-muted-foreground hover:border-primary hover:text-primary"
              onClick={async () => {
                setIsLoading(true)
                await resendVerification(getValues("email"))
                toast.success(t("Verification email resent.", "Email de verificacao reenviado."))
                setIsLoading(false)
              }}
              disabled={isLoading}
            >
              {t("Resend Verification", "Reenviar Verificacao")}
            </Button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(async (data) => {
              setIsLoading(true)
              await forgotPassword(data.email)
              setSent(true)
              toast.success(t("Reset link sent!", "Link de redefinicao enviado!"))
              setIsLoading(false)
            })}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="forgot-email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("Email", "Email")}</Label>
              <Input id="forgot-email" type="email" {...register("email")} className="mt-1 border-border bg-secondary" />
              {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <Button type="submit" className="w-full bg-primary text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90" disabled={isLoading}>
              {isLoading ? t("Sending...", "Enviando...") : t("Send Reset Link", "Enviar Link")}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
