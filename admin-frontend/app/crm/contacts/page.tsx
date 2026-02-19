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

const SEGMENTS = ['VIP', 'High Value', 'At Risk', 'New'] as const;
const LIFECYCLES = ['Lead', 'Prospect', 'Customer', 'Onboarding', 'Churn Risk'] as const;

type Contact = {
  id: string;
  name: string;
  email: string;
  company: string;
  owner?: string;
  segment: (typeof SEGMENTS)[number];
  lastTouch: string;
  lifecycle: string;
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [segmentFilter, setSegmentFilter] = useState<(typeof SEGMENTS)[number] | 'All'>('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkEmailing, setBulkEmailing] = useState(false);
  const [bulkTasking, setBulkTasking] = useState(false);
  const [bulkTaskDueDate, setBulkTaskDueDate] = useState('');
  const [bulkOwner, setBulkOwner] = useState('');
  const [bulkReassigning, setBulkReassigning] = useState(false);
  const [bulkSegment, setBulkSegment] = useState<Contact['segment'] | ''>('');
  const [bulkSegmentUpdating, setBulkSegmentUpdating] = useState(false);
  const [bulkLifecycle, setBulkLifecycle] = useState<(typeof LIFECYCLES)[number] | ''>('');
  const [bulkLifecycleUpdating, setBulkLifecycleUpdating] = useState(false);

  useEffect(() => {
    const token = AuthService.getToken();
    if (!token) {
      setError('Usuário não autenticado.');
      setLoading(false);
      return;
    }
    authFetch(endpoints.admin.crmContacts, {
      headers: {},
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setContacts(data);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Erro ao carregar contatos.');
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    return contacts.filter((contact) => {
      const matchesSearch = [contact.name, contact.email, contact.company, contact.owner]
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesSegment = segmentFilter === 'All' || contact.segment === segmentFilter;
      return matchesSearch && matchesSegment;
    });
  }, [contacts, search, segmentFilter]);

  const updateSegment = async (id: string, segment: Contact['segment']) => {
    setContacts((prev) => prev.map((contact) => (contact.id === id ? { ...contact, segment } : contact)));
    const token = AuthService.getToken();
    if (!token) return;
    try {
      await authFetch(endpoints.admin.crmContactDetail(id), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ segment }),
      });
    } catch {
      setError('Erro ao atualizar segmento.');
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
      if (filtered.every((contact) => next.has(contact.id))) {
        filtered.forEach((contact) => next.delete(contact.id));
      } else {
        filtered.forEach((contact) => next.add(contact.id));
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
      const selected = contacts.filter((contact) => selectedIds.has(contact.id));
      const taskDueDate = bulkTaskDueDate || new Date().toISOString().slice(0, 10);
      const requests = selected.map((contact) => ({
        url: endpoints.admin.crmActivities,
        method: 'POST' as const,
        body: {
          subject: type === 'Email' ? `Email para ${contact.name}` : `Tarefa: follow-up ${contact.name}`,
          owner: 'Equipe CRM',
          contact: contact.name,
          type,
          dueDate: type === 'Task' ? taskDueDate : new Date().toISOString().slice(0, 10),
          status: 'Open',
          notes: [contact.email, contact.company].filter(Boolean).join(' • '),
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
    setContacts((prev) =>
      prev.map((contact) => (selectedIds.has(contact.id) ? { ...contact, owner: bulkOwner.trim() } : contact))
    );
    try {
      const selected = contacts.filter((contact) => selectedIds.has(contact.id));
      const requests = selected.map((contact) => ({
        url: endpoints.admin.crmContactDetail(contact.id),
        method: 'PATCH' as const,
        body: { owner: bulkOwner.trim() },
      }));
      await runBulkRequests(requests, token);
      setSelectedIds(new Set());
      setBulkOwner('');
    } catch {
      setError('Erro ao reatribuir contatos.');
    } finally {
      setBulkReassigning(false);
    }
  };

  const handleBulkSegment = async () => {
    if (selectedIds.size === 0 || !bulkSegment) return;
    const token = AuthService.getToken();
    if (!token) {
      setError('Usuário não autenticado.');
      return;
    }
    setBulkSegmentUpdating(true);
    setError(null);
    setContacts((prev) =>
      prev.map((contact) => (selectedIds.has(contact.id) ? { ...contact, segment: bulkSegment } : contact))
    );
    try {
      const selected = contacts.filter((contact) => selectedIds.has(contact.id));
      const requests = selected.map((contact) => ({
        url: endpoints.admin.crmContactDetail(contact.id),
        method: 'PATCH' as const,
        body: { segment: bulkSegment },
      }));
      await runBulkRequests(requests, token);
      setSelectedIds(new Set());
      setBulkSegment('');
    } catch {
      setError('Erro ao atualizar segmento em massa.');
    } finally {
      setBulkSegmentUpdating(false);
    }
  };

  const handleBulkLifecycle = async () => {
    if (selectedIds.size === 0 || !bulkLifecycle) return;
    const token = AuthService.getToken();
    if (!token) {
      setError('Usuário não autenticado.');
      return;
    }
    setBulkLifecycleUpdating(true);
    setError(null);
    setContacts((prev) =>
      prev.map((contact) => (selectedIds.has(contact.id) ? { ...contact, lifecycle: bulkLifecycle } : contact))
    );
    try {
      const selected = contacts.filter((contact) => selectedIds.has(contact.id));
      const requests = selected.map((contact) => ({
        url: endpoints.admin.crmContactDetail(contact.id),
        method: 'PATCH' as const,
        body: { lifecycle: bulkLifecycle },
      }));
      await runBulkRequests(requests, token);
      setSelectedIds(new Set());
      setBulkLifecycle('');
    } catch {
      setError('Erro ao atualizar lifecycle em massa.');
    } finally {
      setBulkLifecycleUpdating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="space-y-2">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold">CRM • Contatos</h1>
          <p className="text-slate-500">Base de clientes com segmentação e lifecycle.</p>
        </div>
      </header>

      <section className="bg-white border rounded-xl p-4 shadow space-y-4">
        {loading && <div className="text-sm text-slate-500">Carregando contatos...</div>}
        {error && <div className="text-sm text-red-500">{error}</div>}
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <input
            className="border rounded px-3 py-2 flex-1"
            placeholder="Buscar contato por nome, email ou empresa"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Select
            value={segmentFilter}
            onChange={(value) => setSegmentFilter(value as Contact['segment'] | 'All')}
            options={SEGMENTS.map((segment) => ({ value: segment, label: segment }))}
            placeholder="Segmento"
            buttonClassName="border rounded px-3 py-2"
          />
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
              value={bulkSegment}
              onChange={(value) => setBulkSegment(value as Contact['segment'] | '')}
              options={SEGMENTS.map((segment) => ({ value: segment, label: segment }))}
              placeholder="Atualizar segmento"
              buttonClassName="border rounded px-2 py-1 text-sm"
            />
            <button
              type="button"
              onClick={handleBulkSegment}
              disabled={bulkSegmentUpdating || selectedIds.size === 0 || !bulkSegment}
              className="border px-3 py-1 rounded disabled:opacity-60"
            >
              {bulkSegmentUpdating ? 'Atualizando...' : 'Aplicar'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={bulkLifecycle}
              onChange={(value) => setBulkLifecycle(value as (typeof LIFECYCLES)[number] | '')}
              options={LIFECYCLES.map((lifecycle) => ({ value: lifecycle, label: lifecycle }))}
              placeholder="Atualizar lifecycle"
              buttonClassName="border rounded px-2 py-1 text-sm"
            />
            <button
              type="button"
              onClick={handleBulkLifecycle}
              disabled={bulkLifecycleUpdating || selectedIds.size === 0 || !bulkLifecycle}
              className="border px-3 py-1 rounded disabled:opacity-60"
            >
              {bulkLifecycleUpdating ? 'Atualizando...' : 'Aplicar'}
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
                    checked={filtered.length > 0 && filtered.every((contact) => selectedIds.has(contact.id))}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="p-2 border">Contato</th>
                <th className="p-2 border">Empresa</th>
                <th className="p-2 border">Responsável</th>
                <th className="p-2 border">Segmento</th>
                <th className="p-2 border">Lifecycle</th>
                <th className="p-2 border">Último toque</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((contact) => (
                <tr key={contact.id} className="hover:bg-slate-50">
                  <td className="p-2 border">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(contact.id)}
                      onChange={() => toggleSelect(contact.id)}
                    />
                  </td>
                  <td className="p-2 border">
                    <Link href={`/crm/contacts/${contact.id}`} className="font-semibold text-blue-600 hover:underline">
                      {contact.name}
                    </Link>
                    <div className="text-xs text-slate-500">{contact.email}</div>
                  </td>
                  <td className="p-2 border">{contact.company}</td>
                  <td className="p-2 border text-sm text-slate-500">{contact.owner || '—'}</td>
                  <td className="p-2 border">
                    <Select
                      value={contact.segment}
                      onChange={(value) => updateSegment(contact.id, value as Contact['segment'])}
                      options={SEGMENTS.map((segment) => ({ value: segment, label: segment }))}
                      buttonClassName="border rounded px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="p-2 border">{contact.lifecycle}</td>
                  <td className="p-2 border text-sm text-slate-500">{contact.lastTouch}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}




