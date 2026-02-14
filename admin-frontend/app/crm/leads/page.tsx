"use client";

import { useEffect, useMemo, useState } from 'react';
import { endpoints } from '@/services/endpoints';
import Link from 'next/link';
import { AuthService } from '@/services/auth';
import BulkActionsBar from '@/components/BulkActionsBar';
import BackButton from '@/components/BackButton';
import Select from '@/components/Select';
import DateInput from '@/components/DateInput';
import { runBulkRequests } from '@/services/bulk';

const SOURCES = ['Website', 'Instagram', 'Ads', 'Referral', 'Outbound'] as const;
const STATUSES = ['New', 'Qualified', 'Contacted', 'Unqualified'] as const;

type LeadStatus = (typeof STATUSES)[number];

type Lead = {
  id: string;
  name: string;
  email: string;
  company: string;
  value: number;
  owner?: string;
  source: (typeof SOURCES)[number];
  status: LeadStatus;
  createdAt: string;
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'All'>('All');
  const [sourceFilter, setSourceFilter] = useState<(typeof SOURCES)[number] | 'All'>('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkEmailing, setBulkEmailing] = useState(false);
  const [bulkTasking, setBulkTasking] = useState(false);
  const [bulkTaskDueDate, setBulkTaskDueDate] = useState('');
  const [bulkOwner, setBulkOwner] = useState('');
  const [bulkReassigning, setBulkReassigning] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<LeadStatus | ''>('');
  const [bulkStatusUpdating, setBulkStatusUpdating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    company: '',
    value: '',
    source: 'Website',
  });

  useEffect(() => {
    const token = AuthService.getToken();
    if (!token) {
      setError('Usuário não autenticado.');
      setLoading(false);
      return;
    }
    fetch(endpoints.admin.crmLeads, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setLeads(data);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Erro ao carregar leads.');
        setLoading(false);
      });
  }, []);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch = [lead.name, lead.email, lead.company, lead.owner]
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'All' || lead.status === statusFilter;
      const matchesSource = sourceFilter === 'All' || lead.source === sourceFilter;
      return matchesSearch && matchesStatus && matchesSource;
    });
  }, [leads, search, statusFilter, sourceFilter]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const newLead: Lead = {
      id: `L-${Math.floor(Math.random() * 9000) + 1000}`,
      name: form.name,
      email: form.email,
      company: form.company,
      value: Number(form.value || 0),
      owner: 'Equipe CRM',
      source: form.source as Lead['source'],
      status: 'New',
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setLeads((prev) => [newLead, ...prev]);
    setForm({ name: '', email: '', company: '', value: '', source: 'Website' });
    const token = AuthService.getToken();
    if (!token) {
      setError('Usuário não autenticado.');
      return;
    }
    try {
      const res = await fetch(endpoints.admin.crmLeads, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newLead),
      });
      if (res.ok) {
        const created = await res.json();
        setLeads((prev) => [created, ...prev.filter((lead) => lead.id !== newLead.id)]);
      }
    } catch {
      setError('Erro ao criar lead.');
    }
  };

  const updateStatus = async (id: string, status: LeadStatus) => {
    setLeads((prev) => prev.map((lead) => (lead.id === id ? { ...lead, status } : lead)));
    const token = AuthService.getToken();
    if (!token) return;
    try {
      await fetch(endpoints.admin.crmLeadDetail(id), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
    } catch {
      setError('Erro ao atualizar status do lead.');
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

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (filteredLeads.every((lead) => next.has(lead.id))) {
        filteredLeads.forEach((lead) => next.delete(lead.id));
      } else {
        filteredLeads.forEach((lead) => next.add(lead.id));
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
      const selected = leads.filter((lead) => selectedIds.has(lead.id));
      const taskDueDate = bulkTaskDueDate || new Date().toISOString().slice(0, 10);
      const requests = selected.map((lead) => ({
        url: endpoints.admin.crmActivities,
        method: 'POST' as const,
        body: {
          subject: type === 'Email' ? `Email para ${lead.name}` : `Tarefa: follow-up ${lead.name}`,
          owner: 'Equipe CRM',
          contact: lead.name,
          type,
          dueDate: type === 'Task' ? taskDueDate : new Date().toISOString().slice(0, 10),
          status: 'Open',
          notes: [lead.email, lead.company].filter(Boolean).join(' • '),
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
    setLeads((prev) =>
      prev.map((lead) => (selectedIds.has(lead.id) ? { ...lead, owner: bulkOwner.trim() } : lead))
    );
    try {
      const selected = leads.filter((lead) => selectedIds.has(lead.id));
      const requests = selected.map((lead) => ({
        url: endpoints.admin.crmLeadDetail(lead.id),
        method: 'PATCH' as const,
        body: { owner: bulkOwner.trim() },
      }));
      await runBulkRequests(requests, token);
      setSelectedIds(new Set());
      setBulkOwner('');
    } catch {
      setError('Erro ao reatribuir leads.');
    } finally {
      setBulkReassigning(false);
    }
  };

  const handleBulkStatus = async () => {
    if (selectedIds.size === 0 || !bulkStatus) return;
    const token = AuthService.getToken();
    if (!token) {
      setError('Usuário não autenticado.');
      return;
    }
    setBulkStatusUpdating(true);
    setError(null);
    setLeads((prev) =>
      prev.map((lead) => (selectedIds.has(lead.id) ? { ...lead, status: bulkStatus } : lead))
    );
    try {
      const selected = leads.filter((lead) => selectedIds.has(lead.id));
      const requests = selected.map((lead) => ({
        url: endpoints.admin.crmLeadDetail(lead.id),
        method: 'PATCH' as const,
        body: { status: bulkStatus },
      }));
      await runBulkRequests(requests, token);
      setSelectedIds(new Set());
      setBulkStatus('');
    } catch {
      setError('Erro ao atualizar status em massa.');
    } finally {
      setBulkStatusUpdating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="space-y-2">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold">CRM • Leads</h1>
          <p className="text-slate-500">Captação, qualificação e priorização de oportunidades.</p>
        </div>
      </header>

      <section className="bg-white border rounded-xl p-4 shadow space-y-4">
        <h2 className="text-lg font-semibold">Novo Lead</h2>
        <form onSubmit={handleCreate} className="grid md:grid-cols-6 gap-3">
          <input
            className="border rounded px-3 py-2 md:col-span-2"
            placeholder="Nome"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
          <input
            className="border rounded px-3 py-2 md:col-span-2"
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            required
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Empresa"
            value={form.company}
            onChange={(event) => setForm((prev) => ({ ...prev, company: event.target.value }))}
            required
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Valor (R$)"
            type="number"
            min="0"
            value={form.value}
            onChange={(event) => setForm((prev) => ({ ...prev, value: event.target.value }))}
          />
          <Select
            value={form.source}
            onChange={(value) => setForm((prev) => ({ ...prev, source: value }))}
            options={SOURCES.map((source) => ({ value: source, label: source }))}
            buttonClassName="border rounded px-3 py-2"
          />
          <button className="bg-blue-600 text-white rounded px-4 py-2 font-semibold">Criar Lead</button>
        </form>
      </section>

      <section className="bg-white border rounded-xl p-4 shadow space-y-4">
        {loading && <div className="text-sm text-slate-500">Carregando leads...</div>}
        {error && <div className="text-sm text-red-500">{error}</div>}
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="flex gap-3 flex-1">
            <input
              className="border rounded px-3 py-2 flex-1"
              placeholder="Buscar por nome, email ou empresa"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Select
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as LeadStatus | 'All')}
              options={STATUSES.map((status) => ({ value: status, label: status }))}
              placeholder="Status"
              buttonClassName="border rounded px-3 py-2"
            />
            <Select
              value={sourceFilter}
              onChange={(value) => setSourceFilter(value as (typeof SOURCES)[number] | 'All')}
              options={SOURCES.map((source) => ({ value: source, label: source }))}
              placeholder="Origem"
              buttonClassName="border rounded px-3 py-2"
            />
          </div>
          <div className="text-sm text-slate-500">{filteredLeads.length} leads encontrados</div>
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
              value={bulkStatus}
              onChange={(value) => setBulkStatus(value as LeadStatus | '')}
              options={STATUSES.map((status) => ({ value: status, label: status }))}
              placeholder="Atualizar status"
              buttonClassName="border rounded px-2 py-1 text-sm"
            />
            <button
              type="button"
              onClick={handleBulkStatus}
              disabled={bulkStatusUpdating || selectedIds.size === 0 || !bulkStatus}
              className="border px-3 py-1 rounded disabled:opacity-60"
            >
              {bulkStatusUpdating ? 'Atualizando...' : 'Aplicar'}
            </button>
          </div>
        </BulkActionsBar>

        <div className="overflow-auto">
          <table className="w-full border">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="p-2 border">
                  <input
                    type="checkbox"
                    checked={filteredLeads.length > 0 && filteredLeads.every((lead) => selectedIds.has(lead.id))}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="p-2 border">Lead</th>
                <th className="p-2 border">Empresa</th>
                <th className="p-2 border">Responsável</th>
                <th className="p-2 border">Valor</th>
                <th className="p-2 border">Origem</th>
                <th className="p-2 border">Status</th>
                <th className="p-2 border">Criado em</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50">
                  <td className="p-2 border">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(lead.id)}
                      onChange={() => toggleSelect(lead.id)}
                    />
                  </td>
                  <td className="p-2 border">
                    <Link href={`/crm/leads/${lead.id}`} className="font-semibold text-blue-600 hover:underline">
                      {lead.name}
                    </Link>
                    <div className="text-xs text-slate-500">{lead.email}</div>
                  </td>
                  <td className="p-2 border">{lead.company}</td>
                  <td className="p-2 border text-sm text-slate-500">{lead.owner || '—'}</td>
                  <td className="p-2 border">R$ {lead.value.toLocaleString()}</td>
                  <td className="p-2 border">{lead.source}</td>
                  <td className="p-2 border">
                    <Select
                      value={lead.status}
                      onChange={(value) => updateStatus(lead.id, value as LeadStatus)}
                      options={STATUSES.map((status) => ({ value: status, label: status }))}
                      buttonClassName="border rounded px-2 py-1"
                    />
                  </td>
                  <td className="p-2 border text-sm text-slate-500">{lead.createdAt}</td>
                </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
