import type { Metadata, Viewport } from "next"
import { Toaster } from "sonner"

import "./globals.css"
import { Providers } from "./providers"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "InfoTechGamer // Premium Gaming & Tech",
  description:
    "Top-tier gaming hardware, peripherals, and components. Fast delivery, extended warranties, verified sellers.",
}

export const viewport: Viewport = {
  themeColor: "#00d4aa",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <Toaster
            richColors
            position="bottom-right"
            toastOptions={{
              style: {
                background: "hsl(210 15% 9%)",
                border: "1px solid hsl(210 10% 16%)",
                color: "hsl(210 20% 95%)",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
