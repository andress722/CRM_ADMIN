import Link from "next/link"
import { Zap } from "lucide-react"

const footerLinks = [
  { href: "/subscriptions", label: "Plans" },
  { href: "/support", label: "Support" },
  { href: "/privacy", label: "Privacy" },
  { href: "/track-order", label: "Track Order" },
]

export function Footer() {
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
              {link.label}
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
