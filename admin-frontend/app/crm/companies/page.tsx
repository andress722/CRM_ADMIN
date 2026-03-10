"use client";

import { useEffect, useMemo, useState } from "react";
import { authFetch } from "@/services/auth-fetch";
import { endpoints } from "@/services/endpoints";

type CompanyRow = {
  name: string;
  owner?: string;
  contacts: number;
  leads: number;
  opportunities: number;
  pipelineValue: number;
};

type CompaniesResponse = {
  data: CompanyRow[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

export default function CrmCompaniesPage() {
  const [rows, setRows] = useState<CompanyRow[]>([]);
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [newOwner, setNewOwner] = useState("");
  const [renameFrom, setRenameFrom] = useState("");
  const [renameTo, setRenameTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `${endpoints.admin.crmCompanies}?page=1&pageSize=200&search=${encodeURIComponent(search)}`;
      const res = await authFetch(url);
      const data = (await res.json()) as CompaniesResponse;
      setRows(Array.isArray(data?.data) ? data.data : []);
    } catch {
      setError("Erro ao carregar empresas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const totals = useMemo(() => {
    return {
      companies: rows.length,
      contacts: rows.reduce((sum, x) => sum + x.contacts, 0),
      pipeline: rows.reduce((sum, x) => sum + Number(x.pipelineValue || 0), 0),
    };
  }, [rows]);

  const createCompany = async () => {
    if (newName.trim().length < 2) return;
    setSaving(true);
    try {
      await authFetch(endpoints.admin.crmCompanies, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), owner: newOwner.trim() || undefined }),
      });
      setNewName("");
      setNewOwner("");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const renameCompany = async () => {
    if (renameFrom.trim().length < 2 || renameTo.trim().length < 2) return;
    setSaving(true);
    try {
      await authFetch(endpoints.admin.crmCompanyRename, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: renameFrom.trim(), to: renameTo.trim() }),
      });
      setRenameFrom("");
      setRenameTo("");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const archiveCompany = async (name: string) => {
    setSaving(true);
    try {
      await authFetch(`${endpoints.admin.crmCompanies}?name=${encodeURIComponent(name)}&reassignTo=Unassigned`, {
        method: "DELETE",
      });
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white">Empresas</h2>
        <p className="text-sm text-slate-400">Cadastro e gestão de empresas vinculadas ao CRM.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat title="Empresas" value={String(totals.companies)} />
        <Stat title="Contatos vinculados" value={String(totals.contacts)} />
        <Stat title="Pipeline" value={`R$ ${totals.pipeline.toLocaleString()}`} />
      </div>

      <div className="grid gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4 lg:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-semibold">Nova empresa</p>
          <input className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Nome" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <input className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Responsável" value={newOwner} onChange={(e) => setNewOwner(e.target.value)} />
          <button onClick={createCompany} disabled={saving} className="rounded bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-60">Criar empresa</button>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">Renomear empresa</p>
          <input className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Nome atual" value={renameFrom} onChange={(e) => setRenameFrom(e.target.value)} />
          <input className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm" placeholder="Novo nome" value={renameTo} onChange={(e) => setRenameTo(e.target.value)} />
          <button onClick={renameCompany} disabled={saving} className="rounded bg-amber-600 px-3 py-2 text-sm text-white disabled:opacity-60">Renomear</button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="mb-3 flex gap-2">
          <input
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            placeholder="Buscar empresa"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button onClick={load} className="rounded border border-slate-700 px-3 py-2 text-sm">Filtrar</button>
        </div>

        {loading && <div className="text-sm text-slate-400">Carregando...</div>}
        {error && <div className="text-sm text-red-400">{error}</div>}

        {!loading && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400">
                  <th className="px-2 py-2">Empresa</th>
                  <th className="px-2 py-2">Responsável</th>
                  <th className="px-2 py-2">Contatos</th>
                  <th className="px-2 py-2">Leads</th>
                  <th className="px-2 py-2">Oportunidades</th>
                  <th className="px-2 py-2">Pipeline</th>
                  <th className="px-2 py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.name} className="border-t border-slate-800">
                    <td className="px-2 py-2 text-white">{row.name}</td>
                    <td className="px-2 py-2">{row.owner || "-"}</td>
                    <td className="px-2 py-2">{row.contacts}</td>
                    <td className="px-2 py-2">{row.leads}</td>
                    <td className="px-2 py-2">{row.opportunities}</td>
                    <td className="px-2 py-2">R$ {Number(row.pipelineValue || 0).toLocaleString()}</td>
                    <td className="px-2 py-2">
                      <button
                        onClick={() => archiveCompany(row.name)}
                        disabled={saving}
                        className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-300 disabled:opacity-60"
                      >
                        Arquivar
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-2 py-6 text-center text-slate-500">Sem empresas</td>
                  </tr>
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
