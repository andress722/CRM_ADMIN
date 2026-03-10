"use client";

import { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/services/auth-fetch";
import { endpoints } from "@/services/endpoints";

type Proposal = {
  id: string;
  title: string;
  company: string;
  owner: string;
  value: number;
  stage: string;
  probability: number;
  expectedClose?: string;
};

const STATUSES = ["Proposal", "Negotiation", "Won", "Lost", "Archived"] as const;

export default function CrmProposalsPage() {
  const [rows, setRows] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [owner, setOwner] = useState("");
  const [value, setValue] = useState("0");
  const [validUntil, setValidUntil] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await authFetch(endpoints.admin.crmProposals);
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const totals = useMemo(() => {
    const active = rows.filter((x) => x.stage !== "Archived");
    return {
      total: active.length,
      value: active.reduce((sum, x) => sum + Number(x.value || 0), 0),
      won: active.filter((x) => x.stage === "Won").reduce((sum, x) => sum + Number(x.value || 0), 0),
    };
  }, [rows]);

  const create = async () => {
    if (title.trim().length < 2 || company.trim().length < 2) return;
    setSaving(true);
    try {
      await authFetch(endpoints.admin.crmProposals, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          company: company.trim(),
          owner: owner.trim() || "CRM",
          value: Number(value || 0),
          status: "Proposal",
          probability: 50,
          validUntil: validUntil || undefined,
        }),
      });
      setTitle("");
      setCompany("");
      setOwner("");
      setValue("0");
      setValidUntil("");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (id: string, status: string) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, stage: status } : row)));
    await authFetch(endpoints.admin.crmProposalDetail(id), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  };

  const archive = async (id: string) => {
    setSaving(true);
    try {
      await authFetch(endpoints.admin.crmProposalDetail(id), { method: "DELETE" });
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white">Propostas</h2>
        <p className="text-sm text-slate-400">Gestão de propostas comerciais e negociações.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat title="Propostas ativas" value={String(totals.total)} />
        <Stat title="Valor em aberto" value={`R$ ${totals.value.toLocaleString()}`} />
        <Stat title="Valor ganho" value={`R$ ${totals.won.toLocaleString()}`} />
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <p className="mb-3 text-sm font-semibold">Nova proposta</p>
        <div className="grid gap-3 md:grid-cols-5">
          <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Empresa" value={company} onChange={(e) => setCompany(e.target.value)} />
          <input className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Responsável" value={owner} onChange={(e) => setOwner(e.target.value)} />
          <input type="number" className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Valor" value={value} onChange={(e) => setValue(e.target.value)} />
          <input type="date" className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
        </div>
        <button onClick={create} disabled={saving} className="mt-3 rounded bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-60">Criar proposta</button>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        {loading ? (
          <div className="text-sm text-slate-400">Carregando propostas...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400">
                  <th className="px-2 py-2">Título</th>
                  <th className="px-2 py-2">Empresa</th>
                  <th className="px-2 py-2">Owner</th>
                  <th className="px-2 py-2">Valor</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Validade</th>
                  <th className="px-2 py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-800">
                    <td className="px-2 py-2 text-white">{row.title}</td>
                    <td className="px-2 py-2">{row.company}</td>
                    <td className="px-2 py-2">{row.owner}</td>
                    <td className="px-2 py-2">R$ {Number(row.value || 0).toLocaleString()}</td>
                    <td className="px-2 py-2">
                      <select
                        className="rounded border border-slate-700 bg-slate-950 px-2 py-1"
                        value={row.stage}
                        onChange={(e) => void changeStatus(row.id, e.target.value)}
                      >
                        {STATUSES.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2">{row.expectedClose ? new Date(row.expectedClose).toLocaleDateString("pt-BR") : "-"}</td>
                    <td className="px-2 py-2">
                      <button onClick={() => void archive(row.id)} disabled={saving} className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-300 disabled:opacity-60">Arquivar</button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={7} className="px-2 py-6 text-center text-slate-500">Sem propostas</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{title}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}
