"use client"

import { useState } from "react"
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
import { toast } from "sonner"

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

const registerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

const forgotSchema = z.object({
  email: z.string().email("Invalid email"),
})

type LoginValues = z.infer<typeof loginSchema>
type RegisterValues = z.infer<typeof registerSchema>
type ForgotValues = z.infer<typeof forgotSchema>

export default function AccountPage() {
  const router = useRouter()
  const { loginUser, registerUser, isAuthenticated } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  if (isAuthenticated) {
    router.push("/dashboard")
    return null
  }

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center bg-primary">
          <Zap className="h-6 w-6 text-primary-foreground" />
        </div>
        <h1 className="text-xl font-black uppercase tracking-wider text-foreground">Access Your Account</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sign in or create a new account.</p>
      </div>

      <Tabs defaultValue="login" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-secondary">
          <TabsTrigger value="login" className="text-xs font-bold uppercase tracking-wider">Sign In</TabsTrigger>
          <TabsTrigger value="register" className="text-xs font-bold uppercase tracking-wider">Register</TabsTrigger>
          <TabsTrigger value="forgot" className="text-xs font-bold uppercase tracking-wider">Forgot</TabsTrigger>
        </TabsList>

        <TabsContent value="login">
          <LoginForm
            isLoading={isLoading}
            onSubmit={async (data) => {
              setIsLoading(true)
              try {
                await loginUser(data.email, data.password)
                toast.success("Welcome back!")
                window.location.reload()
              } catch {
                toast.error("Invalid credentials.")
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
                toast.success("Account created! Check your email.")
              } catch {
                toast.error("Registration failed.")
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
  const { register, handleSubmit, formState: { errors } } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground">Sign In</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">Enter your credentials.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="login-email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</Label>
            <Input id="login-email" type="email" {...register("email")} className="mt-1 border-border bg-secondary" />
            {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div>
            <Label htmlFor="login-password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password</Label>
            <Input id="login-password" type="password" {...register("password")} className="mt-1 border-border bg-secondary" />
            {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <Button type="submit" className="w-full bg-primary text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 hover:glow-cyan-sm" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function RegisterForm({ isLoading, onSubmit }: { isLoading: boolean; onSubmit: (data: RegisterValues) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) })

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground">Create Account</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">Join for exclusive deals and tracking.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="reg-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name</Label>
            <Input id="reg-name" {...register("name")} className="mt-1 border-border bg-secondary" />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="reg-email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</Label>
            <Input id="reg-email" type="email" {...register("email")} className="mt-1 border-border bg-secondary" />
            {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div>
            <Label htmlFor="reg-password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password</Label>
            <Input id="reg-password" type="password" {...register("password")} className="mt-1 border-border bg-secondary" />
            {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <Button type="submit" className="w-full bg-primary text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 hover:glow-cyan-sm" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function ForgotForm({ isLoading, setIsLoading }: { isLoading: boolean; setIsLoading: (v: boolean) => void }) {
  const [sent, setSent] = useState(false)
  const { register, handleSubmit, getValues, formState: { errors } } = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema) })

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground">Reset Password</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">{"Enter your email to receive a reset link."}</CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <div className="space-y-4 text-center">
            <p className="text-xs text-muted-foreground">If the email exists, a reset link has been sent.</p>
            <Button
              variant="outline"
              className="w-full border-border text-xs font-bold uppercase tracking-wider text-muted-foreground hover:border-primary hover:text-primary"
              onClick={async () => {
                setIsLoading(true)
                await resendVerification(getValues("email"))
                toast.success("Verification email resent.")
                setIsLoading(false)
              }}
              disabled={isLoading}
            >
              Resend Verification
            </Button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(async (data) => {
              setIsLoading(true)
              await forgotPassword(data.email)
              setSent(true)
              toast.success("Reset link sent!")
              setIsLoading(false)
            })}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="forgot-email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</Label>
              <Input id="forgot-email" type="email" {...register("email")} className="mt-1 border-border bg-secondary" />
              {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <Button type="submit" className="w-full bg-primary text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90" disabled={isLoading}>
              {isLoading ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
