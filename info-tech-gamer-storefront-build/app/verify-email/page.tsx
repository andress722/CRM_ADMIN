"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { verifyEmail } from "@/lib/api"

function VerifyContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")

  useEffect(() => {
    if (!token) {
      setStatus("error")
      return
    }
    verifyEmail(token)
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"))
  }, [token])

  return (
    <div className="mx-auto max-w-md px-6 py-20">
      <Card>
        <CardContent className="py-10 text-center">
          {status === "loading" && (
            <>
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
              <h1 className="mt-4 font-serif text-xl font-bold text-foreground">Verifying Your Email</h1>
              <p className="mt-2 text-sm text-muted-foreground">Please wait while we verify your email address.</p>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle className="mx-auto h-12 w-12 text-primary" />
              <h1 className="mt-4 font-serif text-xl font-bold text-foreground">Email Verified</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Your email has been verified successfully. You can now sign in.
              </p>
              <Button asChild className="mt-6">
                <Link href="/account">Sign In</Link>
              </Button>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="mx-auto h-12 w-12 text-destructive" />
              <h1 className="mt-4 font-serif text-xl font-bold text-foreground">Verification Failed</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {token
                  ? "The verification link is invalid or has expired."
                  : "No verification token provided."}
              </p>
              <Button asChild variant="outline" className="mt-6">
                <Link href="/account">Go to Account</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
      <VerifyContent />
    </Suspense>
  )
}
