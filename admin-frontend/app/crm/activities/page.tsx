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

  useEffect(() => {
    const token = AuthService.getToken();
    if (!token) {
      setError('Usuário não autenticado.');
      setLoading(false);
      return;
    }
    authFetch(endpoints.admin.crmActivities, {
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
    );
    const token = AuthService.getToken();
    if (!token) return;
    const current = activities.find((activity) => activity.id === id);
    const nextStatus = current?.status === 'Done' ? 'Open' : 'Done';
    try {
      await authFetch(endpoints.admin.crmActivityDetail(id), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: nextStatus }),
      });
    } catch {
      setError('Erro ao atualizar status da atividade.');
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
    if (selectedIds.size === 0) return;
    const token = AuthService.getToken();
    if (!token) {
      setError('Usuário não autenticado.');
      return;
    }
    setBulkUpdating(true);
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
      await runBulkRequests(requests, token);
      setSelectedIds(new Set());
    } catch {
      setError('Erro ao atualizar atividades em massa.');
    } finally {
      setBulkUpdating(false);
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
      await runBulkRequests(requests, token);
      setSelectedIds(new Set());
      setBulkOwner('');
    } catch {
      setError('Erro ao reatribuir responsável em massa.');
    } finally {
      setBulkReassigning(false);
    }
  };

  const handleBulkDueDate = async () => {
    if (selectedIds.size === 0 || !bulkDueDate) return;
    const token = AuthService.getToken();
    if (!token) {
      setError('Usuário não autenticado.');
      return;
    }
    setBulkDateUpdating(true);
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
      await runBulkRequests(requests, token);
      setSelectedIds(new Set());
      setBulkDueDate('');
    } catch {
      setError('Erro ao atualizar prazo em massa.');
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
          <p className="text-slate-500">Agenda de tarefas, reuniões e follow-ups.</p>
        </div>
      </header>

      <section className="bg-white border rounded-xl p-4 shadow space-y-4">
        {loading && <div className="text-sm text-slate-500">Carregando atividades...</div>}
        {error && <div className="text-sm text-red-500">{error}</div>}
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <input
            className="border rounded px-3 py-2 flex-1"
            placeholder="Buscar por assunto, contato ou responsável"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
          <Select
            value={typeFilter}
            onChange={(value) => setTypeFilter(value as Activity['type'] | 'All')}
            options={TYPES.map((type) => ({ value: type, label: type }))}
            placeholder="Tipo"
            buttonClassName="border rounded px-3 py-2"
          />
        </div>

        <BulkActionsBar selectedCount={selectedIds.size}>
          <button
            type="button"
            onClick={() => handleBulkStatus('Done')}
            disabled={bulkUpdating || selectedIds.size === 0}
            className="border px-3 py-1 rounded disabled:opacity-60"
          >
            {bulkUpdating ? 'Atualizando...' : 'Marcar como feito'}
          </button>
          <button
            type="button"
            onClick={() => handleBulkStatus('Open')}
            disabled={bulkUpdating || selectedIds.size === 0}
            className="border px-3 py-1 rounded disabled:opacity-60"
          >
            {bulkUpdating ? 'Atualizando...' : 'Reabrir atividades'}
          </button>
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
            <DateInput
              className="border rounded px-2 py-1 text-sm"
              value={bulkDueDate}
              onChange={setBulkDueDate}
              placeholder="YYYY-MM-DD"
            />
            <button
              type="button"
              onClick={handleBulkDueDate}
              disabled={bulkDateUpdating || selectedIds.size === 0 || !bulkDueDate}
              className="border px-3 py-1 rounded disabled:opacity-60"
            >
              {bulkDateUpdating ? 'Atualizando...' : 'Atualizar prazo'}
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
                    checked={filtered.length > 0 && filtered.every((activity) => selectedIds.has(activity.id))}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="p-2 border">Atividade</th>
                <th className="p-2 border">Contato</th>
                <th className="p-2 border">Responsável</th>
                <th className="p-2 border">Tipo</th>
                <th className="p-2 border">Prazo</th>
                <th className="p-2 border">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((activity) => (
                <tr key={activity.id} className="hover:bg-slate-50">
                  <td className="p-2 border">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(activity.id)}
                      onChange={() => toggleSelect(activity.id)}
                    />
                  </td>
                  <td className="p-2 border">
                    <Link href={`/crm/activities/${activity.id}`} className="font-semibold text-blue-600 hover:underline">
                      {activity.subject}
                    </Link>
                  </td>
                  <td className="p-2 border">{activity.contact}</td>
                  <td className="p-2 border">{activity.owner}</td>
                  <td className="p-2 border">{activity.type}</td>
                  <td className="p-2 border text-sm text-slate-500">{activity.dueDate}</td>
                  <td className="p-2 border">
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




