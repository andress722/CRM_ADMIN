"use client";

import { useEffect, useMemo, useState } from 'react';
import { endpoints } from '@/services/endpoints';
import { authFetch } from '@/services/auth-fetch';
import Link from 'next/link';
import BulkActionsBar from '@/components/BulkActionsBar';
import BackButton from '@/components/BackButton';
import { runBulkRequests } from '@/services/bulk';
import Select from '@/components/Select';
import DateInput from '@/components/DateInput';

const SEGMENTS = ['VIP', 'High Value', 'At Risk', 'New'] as const;
const LIFECYCLES = ['Lead', 'Prospect', 'Customer', 'Onboarding', 'Churn Risk'] as const;

type Segment = (typeof SEGMENTS)[number];
type Lifecycle = (typeof LIFECYCLES)[number];

type Contact = {
  id: string;
  name: string;
  email: string;
  company: string;
  owner?: string;
  segment: Segment;
  lastTouch: string;
  lifecycle: string;
};

type NewContactForm = {
  name: string;
  email: string;
  company: string;
  owner: string;
  segment: Segment;
  lifecycle: Lifecycle;
  lastTouch: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback;
  const e = error as { message?: string; response?: { data?: { message?: string } } };
  return e.response?.data?.message || e.message || fallback;
}

function validateNewContactForm(input: NewContactForm): string | null {
  if (input.name.trim().length < 3) return 'Nome deve ter ao menos 3 caracteres.';
  if (!EMAIL_PATTERN.test(input.email.trim())) return 'Email invalido.';
  if (input.company.trim().length < 2) return 'Empresa deve ter ao menos 2 caracteres.';
  if (input.owner.trim().length < 2) return 'Responsavel deve ter ao menos 2 caracteres.';
  return null;
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [segmentFilter, setSegmentFilter] = useState<Segment | 'All'>('All');
  const [lifecycleFilter, setLifecycleFilter] = useState<Lifecycle | 'All'>('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newContact, setNewContact] = useState<NewContactForm>({
    name: '',
    email: '',
    company: '',
    owner: 'Equipe CRM',
    segment: 'New',
    lifecycle: 'Lead',
    lastTouch: new Date().toISOString().slice(0, 10),
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkEmailing, setBulkEmailing] = useState(false);
  const [bulkTasking, setBulkTasking] = useState(false);
  const [bulkTaskDueDate, setBulkTaskDueDate] = useState('');
  const [bulkOwner, setBulkOwner] = useState('');
  const [bulkReassigning, setBulkReassigning] = useState(false);
  const [bulkSegment, setBulkSegment] = useState<Segment | ''>('');
  const [bulkSegmentUpdating, setBulkSegmentUpdating] = useState(false);
  const [bulkLifecycle, setBulkLifecycle] = useState<Lifecycle | ''>('');
  const [bulkLifecycleUpdating, setBulkLifecycleUpdating] = useState(false);

  const loadContacts = async () => {

    try {
      const res = await authFetch(endpoints.admin.crmContacts);
      const data = await res.json();
      if (Array.isArray(data)) {
        setContacts(data);
      } else {
        setContacts([]);
      }
      setError(null);
    } catch {
      setError('Erro ao carregar contatos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadContacts();
  }, []);

  const filtered = useMemo(() => {
    return contacts.filter((contact) => {
      const matchesSearch = [contact.name, contact.email, contact.company, contact.owner, contact.lifecycle]
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesSegment = segmentFilter === 'All' || contact.segment === segmentFilter;
      const matchesLifecycle = lifecycleFilter === 'All' || contact.lifecycle === lifecycleFilter;
      return matchesSearch && matchesSegment && matchesLifecycle;
    });
  }, [contacts, search, segmentFilter, lifecycleFilter]);

  const handleCreateContact = async () => {

    const validationError = validateNewContactForm(newContact);
    if (validationError) {
      setError(validationError);
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const res = await authFetch(endpoints.admin.crmContacts, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newContact.name.trim(),
          email: newContact.email.trim(),
          company: newContact.company.trim(),
          owner: newContact.owner.trim(),
          segment: newContact.segment,
          lifecycle: newContact.lifecycle,
          lastTouch: newContact.lastTouch,
          notes: '',
        }),
      });

      if (!res.ok) throw new Error('Erro ao criar contato.');

      setNewContact({
        name: '',
        email: '',
        company: '',
        owner: 'Equipe CRM',
        segment: 'New',
        lifecycle: 'Lead',
        lastTouch: new Date().toISOString().slice(0, 10),
      });
      setShowCreateForm(false);
      await loadContacts();
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao criar contato.'));
    } finally {
      setCreating(false);
    }
  };

  const updateSegment = async (id: string, segment: Segment) => {
    setContacts((prev) => prev.map((contact) => (contact.id === id ? { ...contact, segment } : contact)));
    try {
      const res = await authFetch(endpoints.admin.crmContactDetail(id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segment }),
      });
      if (!res.ok) throw new Error('Erro ao atualizar segmento.');
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao atualizar segmento.'));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (filtered.length > 0 && filtered.every((contact) => next.has(contact.id))) {
        filtered.forEach((contact) => next.delete(contact.id));
      } else {
        filtered.forEach((contact) => next.add(contact.id));
      }
      return next;
    });
  };

  const handleBulkAction = async (type: 'Email' | 'Task') => {
    if (selectedIds.size === 0) return;

    if (type === 'Email') setBulkEmailing(true);
    else setBulkTasking(true);

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
      await runBulkRequests(requests);
      setSelectedIds(new Set());
      setBulkTaskDueDate('');
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao executar ação em massa.'));
    } finally {
      setBulkEmailing(false);
      setBulkTasking(false);
    }
  };

  const handleBulkOwner = async () => {
    if (selectedIds.size === 0 || !bulkOwner.trim()) return;

    setBulkReassigning(true);
    setError(null);
    setContacts((prev) =>
      prev.map((contact) => (selectedIds.has(contact.id) ? { ...contact, owner: bulkOwner.trim() } : contact)),
    );

    try {
      const selected = contacts.filter((contact) => selectedIds.has(contact.id));
      const requests = selected.map((contact) => ({
        url: endpoints.admin.crmContactDetail(contact.id),
        method: 'PATCH' as const,
        body: { owner: bulkOwner.trim() },
      }));
      await runBulkRequests(requests);
      setSelectedIds(new Set());
      setBulkOwner('');
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao reatribuir contatos.'));
    } finally {
      setBulkReassigning(false);
    }
  };

  const handleBulkSegment = async () => {
    if (selectedIds.size === 0 || !bulkSegment) return;

    setBulkSegmentUpdating(true);
    setError(null);
    setContacts((prev) => prev.map((contact) => (selectedIds.has(contact.id) ? { ...contact, segment: bulkSegment } : contact)));

    try {
      const selected = contacts.filter((contact) => selectedIds.has(contact.id));
      const requests = selected.map((contact) => ({
        url: endpoints.admin.crmContactDetail(contact.id),
        method: 'PATCH' as const,
        body: { segment: bulkSegment },
      }));
      await runBulkRequests(requests);
      setSelectedIds(new Set());
      setBulkSegment('');
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao atualizar segmento em massa.'));
    } finally {
      setBulkSegmentUpdating(false);
    }
  };

  const handleBulkLifecycle = async () => {
    if (selectedIds.size === 0 || !bulkLifecycle) return;

    setBulkLifecycleUpdating(true);
    setError(null);
    setContacts((prev) =>
      prev.map((contact) => (selectedIds.has(contact.id) ? { ...contact, lifecycle: bulkLifecycle } : contact)),
    );

    try {
      const selected = contacts.filter((contact) => selectedIds.has(contact.id));
      const requests = selected.map((contact) => ({
        url: endpoints.admin.crmContactDetail(contact.id),
        method: 'PATCH' as const,
        body: { lifecycle: bulkLifecycle },
      }));
      await runBulkRequests(requests);
      setSelectedIds(new Set());
      setBulkLifecycle('');
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao atualizar lifecycle em massa.'));
    } finally {
      setBulkLifecycleUpdating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="space-y-2">
        <BackButton />
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">CRM • Contatos</h1>
            <p className="text-slate-500">Base de clientes com segmentação, lifecycle e ações em massa.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateForm((prev) => !prev)}
            className="bg-blue-600 text-white px-4 py-2 rounded font-semibold"
          >
            {showCreateForm ? 'Cancelar novo contato' : 'Novo contato'}
          </button>
        </div>
      </header>

      {showCreateForm && (
        <section className="bg-white border rounded-xl p-4 shadow space-y-4">
          <h2 className="text-lg font-semibold">Criar contato</h2>
          <div className="grid md:grid-cols-3 gap-3">
            <input
              className="border rounded px-3 py-2"
              placeholder="Nome"
              value={newContact.name}
              onChange={(event) => setNewContact((prev) => ({ ...prev, name: event.target.value }))}
            />
            <input
              className="border rounded px-3 py-2"
              placeholder="Email"
              value={newContact.email}
              onChange={(event) => setNewContact((prev) => ({ ...prev, email: event.target.value }))}
            />
            <input
              className="border rounded px-3 py-2"
              placeholder="Empresa"
              value={newContact.company}
              onChange={(event) => setNewContact((prev) => ({ ...prev, company: event.target.value }))}
            />
            <input
              className="border rounded px-3 py-2"
              placeholder="Responsável"
              value={newContact.owner}
              onChange={(event) => setNewContact((prev) => ({ ...prev, owner: event.target.value }))}
            />
            <Select
              value={newContact.segment}
              onChange={(value) => setNewContact((prev) => ({ ...prev, segment: value as Segment }))}
              options={SEGMENTS.map((segment) => ({ value: segment, label: segment }))}
              placeholder="Segmento"
              buttonClassName="border rounded px-3 py-2"
            />
            <Select
              value={newContact.lifecycle}
              onChange={(value) => setNewContact((prev) => ({ ...prev, lifecycle: value as Lifecycle }))}
              options={LIFECYCLES.map((lifecycle) => ({ value: lifecycle, label: lifecycle }))}
              placeholder="Lifecycle"
              buttonClassName="border rounded px-3 py-2"
            />
            <div className="md:col-span-3">
              <DateInput value={newContact.lastTouch} onChange={(value) => setNewContact((prev) => ({ ...prev, lastTouch: value }))} />
            </div>
          </div>
          <button
            type="button"
            onClick={handleCreateContact}
            disabled={creating}
            className="bg-emerald-600 text-white px-4 py-2 rounded font-semibold disabled:opacity-60"
          >
            {creating ? 'Criando...' : 'Criar contato'}
          </button>
        </section>
      )}

      <section className="bg-white border rounded-xl p-4 shadow space-y-4">
        {loading && <div className="text-sm text-slate-500">Carregando contatos...</div>}
        {error && <div className="text-sm text-red-500">{error}</div>}

        <div className="grid md:grid-cols-4 gap-3">
          <input
            className="border rounded px-3 py-2 md:col-span-2"
            placeholder="Buscar por nome, email, empresa ou responsável"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Select
            value={segmentFilter}
            onChange={(value) => setSegmentFilter(value as Segment | 'All')}
            options={SEGMENTS.map((segment) => ({ value: segment, label: segment }))}
            placeholder="Todos segmentos"
            buttonClassName="border rounded px-3 py-2"
          />
          <Select
            value={lifecycleFilter}
            onChange={(value) => setLifecycleFilter(value as Lifecycle | 'All')}
            options={LIFECYCLES.map((lifecycle) => ({ value: lifecycle, label: lifecycle }))}
            placeholder="Todos lifecycles"
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
          <DateInput className="border rounded px-2 py-1 text-sm" value={bulkTaskDueDate} onChange={setBulkTaskDueDate} placeholder="YYYY-MM-DD" />
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
              onChange={(value) => setBulkSegment(value as Segment | '')}
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
              onChange={(value) => setBulkLifecycle(value as Lifecycle | '')}
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

        {filtered.length === 0 ? (
          <div className="text-sm text-slate-500 border rounded p-4">Nenhum contato encontrado com os filtros atuais.</div>
        ) : (
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
                      <input type="checkbox" checked={selectedIds.has(contact.id)} onChange={() => toggleSelect(contact.id)} />
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
                        onChange={(value) => updateSegment(contact.id, value as Segment)}
                        options={SEGMENTS.map((segment) => ({ value: segment, label: segment }))}
                        buttonClassName="border rounded px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="p-2 border">{contact.lifecycle}</td>
                    <td className="p-2 border text-sm text-slate-500">{contact.lastTouch || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

