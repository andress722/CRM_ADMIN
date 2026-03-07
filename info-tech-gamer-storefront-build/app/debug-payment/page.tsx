import { notFound } from "next/navigation"
import DebugPaymentClient from "./DebugPaymentClient"

export default function DebugPaymentPage() {
  const enableDebugPages = process.env.ENABLE_DEBUG_PAGES === "true"

  if (process.env.NODE_ENV === "production" && !enableDebugPages) {
    notFound()
  }

  return <DebugPaymentClient />
}

