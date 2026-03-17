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

const TYPES = ['Call', 'Email', 'Meeting', 'Task'] as const;
type Activity = {
  id: string;
  subject: string;
  owner: string;
  contact: string;
  type: (typeof TYPES)[number];
  dueDate: string;
  status: 'Open' | 'Done' | 'Overdue';
};


function getErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback;
  const e = error as { message?: string; response?: { data?: { message?: string } } };
  return e.response?.data?.message || e.message || fallback;
}

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<(typeof TYPES)[number] | 'All'>('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkOwner, setBulkOwner] = useState('');
  const [bulkReassigning, setBulkReassigning] = useState(false);
  const [bulkDueDate, setBulkDueDate] = useState('');
  const [bulkDateUpdating, setBulkDateUpdating] = useState(false);

  useEffect(() => {    authFetch(endpoints.admin.crmActivities, {
      headers: {},
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setActivities(data);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Erro ao carregar atividades.');
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    return activities.filter((activity) => {
      const matchesSearch = [activity.subject, activity.owner, activity.contact]
        .join(' ')
        .toLowerCase()
        .includes(filter.toLowerCase());
      const matchesType = typeFilter === 'All' || activity.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [activities, filter, typeFilter]);

  const toggleStatus = async (id: string) => {
    setActivities((prev) =>
      prev.map((activity) =>
        activity.id === id
          ? { ...activity, status: activity.status === 'Done' ? 'Open' : 'Done' }
          : activity
      )
    );    const current = activities.find((activity) => activity.id === id);
    const nextStatus = current?.status === 'Done' ? 'Open' : 'Done';
    try {
      const res = await authFetch(endpoints.admin.crmActivityDetail(id), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error('Erro ao atualizar status da atividade.');
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao atualizar status da atividade.'));
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
      if (filtered.every((activity) => next.has(activity.id))) {
        filtered.forEach((activity) => next.delete(activity.id));
      } else {
        filtered.forEach((activity) => next.add(activity.id));
      }
      return next;
    });
  };

  const handleBulkStatus = async (status: Activity['status']) => {
    if (selectedIds.size === 0) return;    setBulkUpdating(true);
    setError(null);
    setActivities((prev) =>
      prev.map((activity) => (selectedIds.has(activity.id) ? { ...activity, status } : activity))
    );
    try {
      const selected = activities.filter((activity) => selectedIds.has(activity.id));
      const requests = selected.map((activity) => ({
        url: endpoints.admin.crmActivityDetail(activity.id),
        method: 'PATCH' as const,
        body: { status },
      }));
      await runBulkRequests(requests);
      setSelectedIds(new Set());
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao atualizar atividades em massa.'));
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleBulkOwner = async () => {
    if (selectedIds.size === 0 || !bulkOwner.trim()) return;    setBulkReassigning(true);
    setError(null);
    setActivities((prev) =>
      prev.map((activity) =>
        selectedIds.has(activity.id) ? { ...activity, owner: bulkOwner.trim() } : activity
      )
    );
    try {
      const selected = activities.filter((activity) => selectedIds.has(activity.id));
      const requests = selected.map((activity) => ({
        url: endpoints.admin.crmActivityDetail(activity.id),
        method: 'PATCH' as const,
        body: { owner: bulkOwner.trim() },
      }));
      await runBulkRequests(requests);
      setSelectedIds(new Set());
      setBulkOwner('');
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao reatribuir responsável em massa.'));
    } finally {
      setBulkReassigning(false);
    }
  };

  const handleBulkDueDate = async () => {
    if (selectedIds.size === 0 || !bulkDueDate) return;    setBulkDateUpdating(true);
    setError(null);
    setActivities((prev) =>
      prev.map((activity) =>
        selectedIds.has(activity.id) ? { ...activity, dueDate: bulkDueDate } : activity
      )
    );
    try {
      const selected = activities.filter((activity) => selectedIds.has(activity.id));
      const requests = selected.map((activity) => ({
        url: endpoints.admin.crmActivityDetail(activity.id),
        method: 'PATCH' as const,
        body: { dueDate: bulkDueDate },
      }));
      await runBulkRequests(requests);
      setSelectedIds(new Set());
      setBulkDueDate('');
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao atualizar prazo em massa.'));
    } finally {
      setBulkDateUpdating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="space-y-2">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold">CRM • Atividades</h1>
          <p className="text-slate-400">Agenda de tarefas, reuniões e follow-ups.</p>
        </div>
      </header>

      <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 shadow shadow-black/20 space-y-4">
        {loading && <div className="text-sm text-slate-400">Carregando atividades...</div>}
        {error && <div className="text-sm text-red-500">{error}</div>}
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <input
            className="border border-slate-700 bg-slate-950 text-slate-100 rounded px-3 py-2 flex-1"
            placeholder="Buscar por assunto, contato ou responsável"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
          <Select
            value={typeFilter}
            onChange={(value) => setTypeFilter(value as Activity['type'] | 'All')}
            options={TYPES.map((type) => ({ value: type, label: type }))}
            placeholder="Tipo"
            buttonClassName="border border-slate-700 bg-slate-950 text-slate-100 rounded px-3 py-2"
          />
        </div>

        <BulkActionsBar selectedCount={selectedIds.size}>
          <button
            type="button"
            onClick={() => handleBulkStatus('Done')}
            disabled={bulkUpdating || selectedIds.size === 0}
            className="border border-slate-700 bg-slate-900 text-slate-200 px-3 py-1 rounded hover:border-slate-500 disabled:opacity-60"
          >
            {bulkUpdating ? 'Atualizando...' : 'Marcar como feito'}
          </button>
          <button
            type="button"
            onClick={() => handleBulkStatus('Open')}
            disabled={bulkUpdating || selectedIds.size === 0}
            className="border border-slate-700 bg-slate-900 text-slate-200 px-3 py-1 rounded hover:border-slate-500 disabled:opacity-60"
          >
            {bulkUpdating ? 'Atualizando...' : 'Reabrir atividades'}
          </button>
          <div className="flex items-center gap-2">
            <input
              className="border border-slate-700 bg-slate-950 text-slate-100 rounded px-2 py-1 text-sm"
              placeholder="Novo responsável"
              value={bulkOwner}
              onChange={(event) => setBulkOwner(event.target.value)}
            />
            <button
              type="button"
              onClick={handleBulkOwner}
              disabled={bulkReassigning || selectedIds.size === 0 || !bulkOwner.trim()}
              className="border border-slate-700 bg-slate-900 text-slate-200 px-3 py-1 rounded hover:border-slate-500 disabled:opacity-60"
            >
              {bulkReassigning ? 'Atribuindo...' : 'Reatribuir'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <DateInput
              className="border border-slate-700 bg-slate-950 text-slate-100 rounded px-2 py-1 text-sm"
              value={bulkDueDate}
              onChange={setBulkDueDate}
              placeholder="YYYY-MM-DD"
            />
            <button
              type="button"
              onClick={handleBulkDueDate}
              disabled={bulkDateUpdating || selectedIds.size === 0 || !bulkDueDate}
              className="border border-slate-700 bg-slate-900 text-slate-200 px-3 py-1 rounded hover:border-slate-500 disabled:opacity-60"
            >
              {bulkDateUpdating ? 'Atualizando...' : 'Atualizar prazo'}
            </button>
          </div>
        </BulkActionsBar>

        <div className="overflow-auto">
          <table className="w-full border border-slate-700">
            <thead>
              <tr className="bg-slate-800/70 text-left text-slate-200">
                <th className="p-2 border border-slate-700">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && filtered.every((activity) => selectedIds.has(activity.id))}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="p-2 border border-slate-700">Atividade</th>
                <th className="p-2 border border-slate-700">Contato</th>
                <th className="p-2 border border-slate-700">Responsável</th>
                <th className="p-2 border border-slate-700">Tipo</th>
                <th className="p-2 border border-slate-700">Prazo</th>
                <th className="p-2 border border-slate-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((activity) => (
                <tr key={activity.id} className="hover:bg-slate-800/40">
                  <td className="p-2 border border-slate-700">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(activity.id)}
                      onChange={() => toggleSelect(activity.id)}
                    />
                  </td>
                  <td className="p-2 border border-slate-700">
                    <Link href={`/crm/activities/${activity.id}`} className="font-semibold text-blue-600 hover:underline">
                      {activity.subject}
                    </Link>
                  </td>
                  <td className="p-2 border border-slate-700">{activity.contact}</td>
                  <td className="p-2 border border-slate-700">{activity.owner}</td>
                  <td className="p-2 border border-slate-700">{activity.type}</td>
                  <td className="p-2 border text-sm text-slate-500">{activity.dueDate}</td>
                  <td className="p-2 border border-slate-700">
                    <button
                      type="button"
                      onClick={() => toggleStatus(activity.id)}
                      className={`px-3 py-1 rounded text-xs font-semibold ${
                        activity.status === 'Done'
                          ? 'bg-green-100 text-green-700'
                          : activity.status === 'Overdue'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {activity.status}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}









