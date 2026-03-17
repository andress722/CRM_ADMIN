"use client";

import BackButton from "@/components/BackButton";
import BulkActionsBar from "@/components/BulkActionsBar";
import DateInput from "@/components/DateInput";
import Select from "@/components/Select";
import { runBulkRequests } from "@/services/bulk";
import { endpoints } from "@/services/endpoints";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const STAGES = [
  "Prospecting",
  "Discovery",
  "Proposal",
  "Negotiation",
  "Won",
  "Lost",
] as const;

type Stage = (typeof STAGES)[number];

type Deal = {
  id: string;
  title: string;
  company: string;
  owner: string;
  value: number;
  stage: Stage;
  probability: number;
  expectedClose: string;
};

export default function DealsPipelinePage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOwner, setBulkOwner] = useState("");
  const [bulkReassigning, setBulkReassigning] = useState(false);
  const [bulkStage, setBulkStage] = useState<Stage | "">("");
  const [bulkStageUpdating, setBulkStageUpdating] = useState(false);
  const [bulkCloseDate, setBulkCloseDate] = useState("");
  const [bulkCloseUpdating, setBulkCloseUpdating] = useState(false);

  useEffect(() => {    fetch(endpoints.admin.crmDeals, {
      
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setDeals(data);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Erro ao carregar pipeline.");
        setLoading(false);
      });
  }, []);

  const totals = useMemo(() => {
    return STAGES.reduce(
      (acc, stage) => {
        acc[stage] = deals
          .filter((deal) => deal.stage === stage)
          .reduce((sum, deal) => sum + deal.value, 0);
        return acc;
      },
      {} as Record<Stage, number>,
    );
  }, [deals]);

  const moveDeal = async (id: string, stage: Stage) => {
    setDeals((prev) =>
      prev.map((deal) => (deal.id === id ? { ...deal, stage } : deal)),
    );    try {
      await fetch(endpoints.admin.crmDealDetail(id), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",

        },
        body: JSON.stringify({ stage }),
      });
    } catch {
      setError("Erro ao mover negócio.");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkOwner = async () => {
    if (selectedIds.size === 0 || !bulkOwner.trim()) return;    setBulkReassigning(true);
    setError(null);
    setDeals((prev) =>
      prev.map((deal) =>
        selectedIds.has(deal.id) ? { ...deal, owner: bulkOwner.trim() } : deal,
      ),
    );
    try {
      const selected = deals.filter((deal) => selectedIds.has(deal.id));
      const requests = selected.map((deal) => ({
        url: endpoints.admin.crmDealDetail(deal.id),
        method: "PATCH" as const,
        body: { owner: bulkOwner.trim() },
      }));
      await runBulkRequests(requests);
      setSelectedIds(new Set());
      setBulkOwner("");
    } catch {
      setError("Erro ao reatribuir negócios em massa.");
    } finally {
      setBulkReassigning(false);
    }
  };

  const handleBulkStage = async () => {
    if (selectedIds.size === 0 || !bulkStage) return;    setBulkStageUpdating(true);
    setError(null);
    setDeals((prev) =>
      prev.map((deal) =>
        selectedIds.has(deal.id) ? { ...deal, stage: bulkStage } : deal,
      ),
    );
    try {
      const selected = deals.filter((deal) => selectedIds.has(deal.id));
      const requests = selected.map((deal) => ({
        url: endpoints.admin.crmDealDetail(deal.id),
        method: "PATCH" as const,
        body: { stage: bulkStage },
      }));
      await runBulkRequests(requests);
      setSelectedIds(new Set());
      setBulkStage("");
    } catch {
      setError("Erro ao atualizar etapa em massa.");
    } finally {
      setBulkStageUpdating(false);
    }
  };

  const handleBulkCloseDate = async () => {
    if (selectedIds.size === 0 || !bulkCloseDate) return;    setBulkCloseUpdating(true);
    setError(null);
    setDeals((prev) =>
      prev.map((deal) =>
        selectedIds.has(deal.id)
          ? { ...deal, expectedClose: bulkCloseDate }
          : deal,
      ),
    );
    try {
      const selected = deals.filter((deal) => selectedIds.has(deal.id));
      const requests = selected.map((deal) => ({
        url: endpoints.admin.crmDealDetail(deal.id),
        method: "PATCH" as const,
        body: { expectedClose: bulkCloseDate },
      }));
      await runBulkRequests(requests);
      setSelectedIds(new Set());
      setBulkCloseDate("");
    } catch {
      setError("Erro ao atualizar fechamento em massa.");
    } finally {
      setBulkCloseUpdating(false);
    }
  };

  if (loading) return <div className="p-6">Carregando pipeline...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold">CRM • Pipeline</h1>
            <p className="text-slate-500">
              Arraste visualmente seus negócios por etapa (versão inicial).
            </p>
          </div>
        </div>
        <Link
          href="/crm/deals"
          className="text-sm text-blue-600 hover:underline"
        >
          Ver lista
        </Link>
      </header>

      <section className="bg-white border rounded-xl p-4 shadow flex flex-wrap gap-4">
        {STAGES.map((stage) => (
          <div key={stage} className="flex-1 min-w-[160px]">
            <p className="text-xs uppercase text-slate-400">{stage}</p>
            <p className="text-lg font-semibold">
              R$ {totals[stage]?.toLocaleString()}
            </p>
          </div>
        ))}
      </section>

      <section className="bg-white border rounded-xl p-4 shadow">
        <BulkActionsBar selectedCount={selectedIds.size}>
          <div className="flex items-center gap-2">
            <input
              className="border rounded px-2 py-1 text-sm"
              placeholder="Novo responsável"
              value={bulkOwner}
              onChange={(event) => setBulkOwner(event.target.value)}
            />
            <button
              type="button"
              onClick={handleBulkOwner}
              disabled={
                bulkReassigning || selectedIds.size === 0 || !bulkOwner.trim()
              }
              className="border px-3 py-1 rounded disabled:opacity-60"
            >
              {bulkReassigning ? "Atribuindo..." : "Reatribuir"}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={bulkStage}
              onChange={(value) => setBulkStage(value as Stage | "")}
              options={STAGES.map((stage) => ({ value: stage, label: stage }))}
              placeholder="Mover para etapa"
              buttonClassName="border rounded px-2 py-1 text-sm"
            />
            <button
              type="button"
              onClick={handleBulkStage}
              disabled={
                bulkStageUpdating || selectedIds.size === 0 || !bulkStage
              }
              className="border px-3 py-1 rounded disabled:opacity-60"
            >
              {bulkStageUpdating ? "Movendo..." : "Atualizar etapa"}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <DateInput value={bulkCloseDate} onChange={setBulkCloseDate} />
            <button
              type="button"
              onClick={handleBulkCloseDate}
              disabled={
                bulkCloseUpdating || selectedIds.size === 0 || !bulkCloseDate
              }
              className="border px-3 py-1 rounded disabled:opacity-60"
            >
              {bulkCloseUpdating ? "Atualizando..." : "Atualizar fechamento"}
            </button>
          </div>
        </BulkActionsBar>
      </section>

      <section className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {STAGES.map((stage) => (
          <div key={stage} className="bg-slate-50 border rounded-lg p-3">
            <h3 className="text-sm font-semibold mb-3">{stage}</h3>
            <div className="space-y-3">
              {deals
                .filter((deal) => deal.stage === stage)
                .map((deal) => (
                  <div
                    key={deal.id}
                    className="bg-white border rounded-lg p-3 shadow-sm"
                  >
                    <label className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(deal.id)}
                        onChange={() => toggleSelect(deal.id)}
                      />
                      Selecionar
                    </label>
                    <p className="font-semibold">{deal.title}</p>
                    <p className="text-sm text-slate-500">{deal.company}</p>
                    <p className="text-xs text-slate-400">
                      Owner: {deal.owner}
                    </p>
                    <div className="flex items-center justify-between mt-2 text-sm">
                      <span className="font-semibold">
                        R$ {deal.value.toLocaleString()}
                      </span>
                      <span className="text-slate-400">
                        {deal.probability}%
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Fechamento: {deal.expectedClose}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Select
                        value={deal.stage}
                        onChange={(value) => moveDeal(deal.id, value as Stage)}
                        options={STAGES.map((option) => ({
                          value: option,
                          label: option,
                        }))}
                        buttonClassName="border rounded px-2 py-1 text-xs"
                      />
                      <Link
                        href={`/crm/deals/${deal.id}`}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Abrir
                      </Link>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}



