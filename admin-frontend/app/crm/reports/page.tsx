"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/services/auth-fetch";
import { endpoints } from "@/services/endpoints";

type Overview = {
  generatedAt?: string;
  daily?: { soldRevenue?: number; ordersSold?: number; cartAbandonRate?: number; cancelRate?: number };
  weekly?: { soldRevenue?: number; ordersSold?: number; cartAbandonRate?: number; cancelRate?: number };
  monthly?: { soldRevenue?: number; ordersSold?: number; cartAbandonRate?: number; cancelRate?: number };
};

export default function CrmReportsPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [emailTo, setEmailTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    authFetch(endpoints.admin.crmReportsOverview)
      .then((r) => r.json())
      .then((data) => setOverview(data || null))
      .finally(() => setLoading(false));
  }, []);

  const sendEmail = async () => {
    if (!emailTo.trim()) return;
    setSending(true);
    setMessage(null);
    try {
      const res = await authFetch(endpoints.admin.crmReportsOverviewEmail, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: emailTo.trim() }),
      });
      if (!res.ok) {
        setMessage("Falha ao enviar relatório por email.");
      } else {
        setMessage("Relatório enviado por email com sucesso.");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white">Relatórios CRM</h2>
        <p className="text-sm text-slate-400">KPIs de vendas, conversão e abandono por período.</p>
      </div>

      {loading && <div className="text-sm text-slate-400">Carregando relatório...</div>}

      {!loading && overview && (
        <div className="grid gap-4 md:grid-cols-3">
          <PeriodCard title="Diário" data={overview.daily} />
          <PeriodCard title="Semanal" data={overview.weekly} />
          <PeriodCard title="Mensal" data={overview.monthly} />
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <p className="mb-2 text-sm font-semibold">Enviar relatório por email</p>
        <div className="flex flex-col gap-2 md:flex-row">
          <input
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            placeholder="email@dominio.com"
            value={emailTo}
            onChange={(e) => setEmailTo(e.target.value)}
          />
          <button onClick={sendEmail} disabled={sending} className="rounded bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-60">
            {sending ? "Enviando..." : "Enviar"}
          </button>
        </div>
        {message && <p className="mt-2 text-sm text-slate-300">{message}</p>}
      </div>
    </div>
  );
}

function PeriodCard({ title, data }: { title: string; data?: { soldRevenue?: number; ordersSold?: number; cartAbandonRate?: number; cancelRate?: number } }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <div className="mt-3 space-y-1 text-sm text-slate-300">
        <p>Receita: R$ {Number(data?.soldRevenue || 0).toLocaleString()}</p>
        <p>Pedidos: {Number(data?.ordersSold || 0)}</p>
        <p>Abandono carrinho: {(Number(data?.cartAbandonRate || 0) * 100).toFixed(1)}%</p>
        <p>Cancelamento: {(Number(data?.cancelRate || 0) * 100).toFixed(1)}%</p>
      </div>
    </div>
  );
}
