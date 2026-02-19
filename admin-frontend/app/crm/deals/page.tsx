"use client";

import { useEffect, useMemo, useState } from 'react';
import { endpoints } from '@/services/endpoints';
import { AuthService } from '@/services/auth';
import { authFetch } from '@/services/auth-fetch';
import Link from 'next/link';
import BulkActionsBar from '@/components/BulkActionsBar';
import BackButton from '@/components/BackButton';
import { runBulkRequests } from '@/services/bulk';
import Select from '@/components/Select';
import DateInput from '@/components/DateInput';

const STAGES = ['Prospecting', 'Discovery', 'Proposal', 'Negotiation', 'Won', 'Lost'] as const;

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

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkEmailing, setBulkEmailing] = useState(false);
  const [bulkTasking, setBulkTasking] = useState(false);
  const [bulkTaskDueDate, setBulkTaskDueDate] = useState('');
  const [bulkOwner, setBulkOwner] = useState('');
  const [bulkReassigning, setBulkReassigning] = useState(false);
  const [bulkStage, setBulkStage] = useState<Stage | ''>('');
  const [bulkStageUpdating, setBulkStageUpdating] = useState(false);

  useEffect(() => {
    const token = AuthService.getToken();
    if (!token) {
      setError('Usuário não autenticado.');
      setLoading(false);
      return;
    }
    authFetch(endpoints.admin.crmDeals, {
      headers: {},
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setDeals(data);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Erro ao carregar negócios.');
        setLoading(false);
      });
  }, []);

  const totals = useMemo(() => {
    return STAGES.reduce((acc, stage) => {
      acc[stage] = deals.filter((deal) => deal.stage === stage).reduce((sum, deal) => sum + deal.value, 0);
      return acc;
    }, {} as Record<Stage, number>);
  }, [deals]);

  const filteredDeals = useMemo(() => {
    return deals.filter((deal) =>
      [deal.title, deal.company, deal.owner].join(' ').toLowerCase().includes(filter.toLowerCase())
    );
  }, [deals, filter]);

  const moveDeal = async (id: string, stage: Stage) => {
    setDeals((prev) => prev.map((deal) => (deal.id === id ? { ...deal, stage } : deal)));
    const token = AuthService.getToken();
    if (!token) return;
    try {
      await authFetch(endpoints.admin.crmDealDetail(id), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stage }),
      });
    } catch {
      setError('Erro ao atualizar estágio do negócio.');
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

  const handleBulkAction = async (type: 'Email' | 'Task') => {
    if (selectedIds.size === 0) return;
    const token = AuthService.getToken();
    if (!token) {
      setError('Usuário não autenticado.');
      return;
    }
    if (type === 'Email') {
      setBulkEmailing(true);
    } else {
      setBulkTasking(true);
    }
    setError(null);
    try {
      const selected = deals.filter((deal) => selectedIds.has(deal.id));
      const taskDueDate = bulkTaskDueDate || new Date().toISOString().slice(0, 10);
      const requests = selected.map((deal) => ({
        url: endpoints.admin.crmActivities,
        method: 'POST' as const,
        body: {
          subject: type === 'Email' ? `Email sobre ${deal.title}` : `Tarefa: acompanhar ${deal.title}`,
          owner: deal.owner || 'Equipe CRM',
          contact: deal.company,
          type,
          dueDate: type === 'Task' ? taskDueDate : new Date().toISOString().slice(0, 10),
          status: 'Open',
          notes: `Negócio: ${deal.title}`,
        },
      }));
      await runBulkRequests(requests, token);
      setSelectedIds(new Set());
      setBulkTaskDueDate('');
    } catch {
      setError('Erro ao executar ação em massa.');
    } finally {
      setBulkEmailing(false);
      setBulkTasking(false);
    }
  };

  const handleBulkOwner = async () => {
    if (selectedIds.size === 0 || !bulkOwner.trim()) return;
    const token = AuthService.getToken();
    if (!token) {
      setError('Usuário não autenticado.');
      return;
    }
    setBulkReassigning(true);
    setError(null);
    setDeals((prev) =>
      prev.map((deal) => (selectedIds.has(deal.id) ? { ...deal, owner: bulkOwner.trim() } : deal))
    );
    try {
      const selected = deals.filter((deal) => selectedIds.has(deal.id));
      const requests = selected.map((deal) => ({
        url: endpoints.admin.crmDealDetail(deal.id),
        method: 'PATCH' as const,
        body: { owner: bulkOwner.trim() },
      }));
      await runBulkRequests(requests, token);
      setSelectedIds(new Set());
      setBulkOwner('');
    } catch {
      setError('Erro ao reatribuir negócios.');
    } finally {
      setBulkReassigning(false);
    }
  };

  const handleBulkStage = async () => {
    if (selectedIds.size === 0 || !bulkStage) return;
    const token = AuthService.getToken();
    if (!token) {
      setError('Usuário não autenticado.');
      return;
    }
    setBulkStageUpdating(true);
    setError(null);
    setDeals((prev) =>
      prev.map((deal) => (selectedIds.has(deal.id) ? { ...deal, stage: bulkStage } : deal))
    );
    try {
      const selected = deals.filter((deal) => selectedIds.has(deal.id));
      const requests = selected.map((deal) => ({
        url: endpoints.admin.crmDealDetail(deal.id),
        method: 'PATCH' as const,
        body: { stage: bulkStage },
      }));
      await runBulkRequests(requests, token);
      setSelectedIds(new Set());
      setBulkStage('');
    } catch {
      setError('Erro ao atualizar estágio em massa.');
    } finally {
      setBulkStageUpdating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="space-y-2">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold">CRM • Deals</h1>
          <p className="text-slate-500">Pipeline com previsão de receita por etapa.</p>
        </div>
      </header>

      <section className="bg-white border rounded-xl p-4 shadow flex flex-wrap gap-4">
        {loading && <div className="text-sm text-slate-500">Carregando negócios...</div>}
        {error && <div className="text-sm text-red-500">{error}</div>}
        {STAGES.map((stage) => (
          <div key={stage} className="flex-1 min-w-[160px]">
            <p className="text-xs uppercase text-slate-400">{stage}</p>
            <p className="text-lg font-semibold">R$ {totals[stage]?.toLocaleString()}</p>
          </div>
        ))}
      </section>

      <section className="bg-white border rounded-xl p-4 shadow space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <input
            className="border rounded px-3 py-2 w-full md:max-w-md"
            placeholder="Buscar negócios por título, empresa ou responsável"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span>{filteredDeals.length} negócios</span>
            <Link href="/crm/deals/pipeline" className="text-blue-600 hover:underline">
              Ver pipeline
            </Link>
          </div>
        </div>

        <BulkActionsBar selectedCount={selectedIds.size}>
          <button
            type="button"
            onClick={() => handleBulkAction('Email')}
            disabled={bulkEmailing || selectedIds.size === 0}
            className="border px-3 py-1 rounded disabled:opacity-60"
          >
            {bulkEmailing ? 'Enviando...' : 'Enviar email em massa'}
          </button>
          <button
            type="button"
            onClick={() => handleBulkAction('Task')}
            disabled={bulkTasking || selectedIds.size === 0}
            className="border px-3 py-1 rounded disabled:opacity-60"
          >
            {bulkTasking ? 'Criando...' : 'Criar tarefas em massa'}
          </button>
          <DateInput
            className="border rounded px-2 py-1 text-sm"
            value={bulkTaskDueDate}
            onChange={setBulkTaskDueDate}
            placeholder="YYYY-MM-DD"
          />
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
              disabled={bulkReassigning || selectedIds.size === 0 || !bulkOwner.trim()}
              className="border px-3 py-1 rounded disabled:opacity-60"
            >
              {bulkReassigning ? 'Atribuindo...' : 'Reatribuir'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={bulkStage}
              onChange={(value) => setBulkStage(value as Stage | '')}
              options={STAGES.map((stage) => ({ value: stage, label: stage }))}
              placeholder="Mover para etapa"
              buttonClassName="border rounded px-2 py-1 text-sm"
            />
            <button
              type="button"
              onClick={handleBulkStage}
              disabled={bulkStageUpdating || selectedIds.size === 0 || !bulkStage}
              className="border px-3 py-1 rounded disabled:opacity-60"
            >
              {bulkStageUpdating ? 'Movendo...' : 'Atualizar etapa'}
            </button>
          </div>
        </BulkActionsBar>

        <div className="grid md:grid-cols-3 gap-4">
          {STAGES.map((stage) => (
            <div key={stage} className="bg-slate-50 rounded-lg p-3 border">
              <h3 className="text-sm font-semibold mb-3">{stage}</h3>
              <div className="space-y-3">
                {filteredDeals
                  .filter((deal) => deal.stage === stage)
                  .map((deal) => (
                    <div key={deal.id} className="bg-white border rounded-lg p-3 shadow-sm">
                      <label className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(deal.id)}
                          onChange={() => toggleSelect(deal.id)}
                        />
                        Selecionar
                      </label>
                      <Link href={`/crm/deals/${deal.id}`} className="font-semibold text-blue-600 hover:underline">
                        {deal.title}
                      </Link>
                      <p className="text-sm text-slate-500">{deal.company}</p>
                      <p className="text-sm text-slate-500">Owner: {deal.owner}</p>
                      <div className="flex items-center justify-between mt-2 text-sm">
                        <span className="font-semibold">R$ {deal.value.toLocaleString()}</span>
                        <span className="text-slate-400">{deal.probability}%</span>
                      </div>
                      <div className="text-xs text-slate-400">Fechamento: {deal.expectedClose}</div>
                      <div className="mt-2">
                        <Select
                          value={deal.stage}
                          onChange={(value) => moveDeal(deal.id, value as Stage)}
                          options={STAGES.map((option) => ({ value: option, label: option }))}
                          buttonClassName="border rounded px-2 py-1 text-sm"
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}




