"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/crm", label: "Dashboard" },
  { href: "/crm/companies", label: "Empresas" },
  { href: "/crm/contacts", label: "Contatos" },
  { href: "/crm/leads", label: "Leads" },
  { href: "/crm/deals", label: "Oportunidades" },
  { href: "/crm/proposals", label: "Propostas" },
  { href: "/crm/activities", label: "Atividades" },
  { href: "/crm/reports", label: "Relatórios" },
];

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentPath = pathname ?? "";

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-sm font-semibold uppercase tracking-widest text-slate-300">CRM</h1>
            <p className="text-xs text-slate-500">Pipeline comercial e relacionamento</p>
          </div>
          <Link href="/admin" className="text-xs text-slate-400 hover:text-slate-200">
            Voltar ao Admin
          </Link>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-3">
          {NAV_ITEMS.map((item) => {
            const active = currentPath === item.href || currentPath.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}


