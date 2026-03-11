"use client"

import Link from "next/link"
import { Zap } from "lucide-react"
import { useLocale } from "@/lib/locale-context"

const footerLinks = [
  { href: "/subscriptions", en: "Plans", pt: "Planos" },
  { href: "/support", en: "Support", pt: "Suporte" },
  { href: "/privacy", en: "Privacy", pt: "Privacidade" },
  { href: "/track-order", en: "Track Order", pt: "Rastrear Pedido" },
] as const

export function Footer() {
  const { t } = useLocale()

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-6 px-6 py-8 md:flex-row md:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center bg-primary">
            <Zap className="h-3 w-3 text-primary-foreground" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            InfoTechGamer
          </span>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary"
            >
              {t(link.en, link.pt)}
            </Link>
          ))}
        </nav>

        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {"2026 InfoTechGamer"}
        </p>
      </div>
    </footer>
  )
}
