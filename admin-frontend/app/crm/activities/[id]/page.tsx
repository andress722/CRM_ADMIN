"use client";

import { useEffect, useMemo, useState } from 'react';
import { LoadingState, ErrorState } from '@/components/ui/AsyncState';
import { useParams, useRouter } from 'next/navigation';
import { AuthService } from '@/services/auth';
import { authFetch } from '@/services/auth-fetch';
import { endpoints } from '@/services/endpoints';
import BackButton from '@/components/BackButton';
import DateInput from '@/components/DateInput';
import Select from '@/components/Select';

const TYPES = ['Call', 'Email', 'Meeting', 'Task'] as const;

const STATUS_STYLES: Record<Activity['status'], string> = {
  Open: 'bg-blue-100 text-blue-700',
  Done: 'bg-green-100 text-green-700',
  Overdue: 'bg-red-100 text-red-700',
};

type Activity = {
  id: string;
  subject: string;
  owner: string;
  contact: string;
  type: (typeof TYPES)[number];
  dueDate: string;
  status: 'Open' | 'Done' | 'Overdue';
  notes?: string;
};

export default function ActivityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params?.id) ? params?.id[0] : params?.id;

  const [activity, setActivity] = useState<Activity | null>(null);
  const [form, setForm] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const token = AuthService.getToken();
    if (!token) {
      setError('Usuário não autenticado.');
      setLoading(false);
      return;
    }
    authFetch(endpoints.admin.crmActivityDetail(id), {
      headers: {},
    })
      .then((res) => res.json())
      .then((data) => {
        setActivity(data);
        setForm(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Erro ao carregar atividade.');
        setLoading(false);
      });
  }, [id]);

  const hasChanges = useMemo(() => JSON.stringify(activity) !== JSON.stringify(form), [activity, form]);

  const handleSave = async () => {
    if (!form || !id) return;
    setSaving(true);
    setError(null);
    const token = AuthService.getToken();
    if (!token) {
      setError('Usuário não autenticado.');
      setSaving(false);
      return;
    }
    try {
      const res = await authFetch(endpoints.admin.crmActivityDetail(id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Erro ao salvar atividade');
      const updated = await res.json();
      setActivity(updated);
      setForm(updated);
    } catch {
      setError('Erro ao salvar atividade.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    setError(null);
    const token = AuthService.getToken();
    if (!token) {
      setError('Usuário não autenticado.');
      setDeleting(false);
      return;
    }
    try {
      const res = await authFetch(endpoints.admin.crmActivityDetail(id), {
        method: 'DELETE',
        headers: {},
      });
      if (!res.ok) throw new Error('Erro ao remover atividade');
      router.push('/crm/activities');
    } catch {
      setError('Erro ao remover atividade.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <LoadingState message="Carregando atividade..." />;
  if (error) return <ErrorState message={error} />;
  if (!form) return <div className="p-6">Atividade não encontrada.</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <BackButton />
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{form.subject}</h1>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_STYLES[form.status]}`}>
                {form.status}
              </span>
            </div>
            <p className="text-slate-500">Detalhes da atividade e execução.</p>
          </div>
        </div>
      </div>

      <section className="grid md:grid-cols-3 gap-4">
        <div className="bg-white border rounded-xl p-4 shadow">
          <p className="text-xs text-slate-500">Tipo</p>
          <p className="text-lg font-semibold">{form.type}</p>
        </div>
        <div className="bg-white border rounded-xl p-4 shadow">
          <p className="text-xs text-slate-500">Prazo</p>
          <p className="text-lg font-semibold">{form.dueDate || 'Sem prazo'}</p>
        </div>
        <div className="bg-white border rounded-xl p-4 shadow">
          <p className="text-xs text-slate-500">Responsável</p>
          <p className="text-lg font-semibold">{form.owner}</p>
        </div>
      </section>

      <section className="bg-white border rounded-xl p-4 shadow space-y-4">
        <h2 className="text-lg font-semibold">Detalhes da atividade</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <label className="space-y-1">
            <span className="text-sm text-slate-500">Assunto</span>
            <input
              className="border rounded px-3 py-2 w-full"
              value={form.subject}
              onChange={(event) => setForm((prev) => (prev ? { ...prev, subject: event.target.value } : prev))}
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-slate-500">Contato</span>
            <input
              className="border rounded px-3 py-2 w-full"
              value={form.contact}
              onChange={(event) => setForm((prev) => (prev ? { ...prev, contact: event.target.value } : prev))}
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-slate-500">Responsável</span>
            <input
              className="border rounded px-3 py-2 w-full"
              value={form.owner}
              onChange={(event) => setForm((prev) => (prev ? { ...prev, owner: event.target.value } : prev))}
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-slate-500">Tipo</span>
            <Select
              value={form.type}
              onChange={(value) => setForm((prev) => (prev ? { ...prev, type: value as Activity['type'] } : prev))}
              options={TYPES.map((type) => ({ value: type, label: type }))}
              buttonClassName="border rounded px-3 py-2 w-full"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-slate-500">Prazo</span>
            <DateInput
              value={form.dueDate}
              onChange={(value) => setForm((prev) => (prev ? { ...prev, dueDate: value } : prev))}
              className="w-full"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-slate-500">Status</span>
            <Select
              value={form.status}
              onChange={(value) => setForm((prev) => (prev ? { ...prev, status: value as Activity['status'] } : prev))}
              options={['Open', 'Done', 'Overdue'].map((status) => ({ value: status, label: status }))}
              buttonClassName="border rounded px-3 py-2 w-full"
            />
          </label>
        </div>
        <label className="space-y-1">
          <span className="text-sm text-slate-500">Notas</span>
          <textarea
            className="border rounded px-3 py-2 w-full"
            rows={4}
            value={form.notes || ''}
            onChange={(event) => setForm((prev) => (prev ? { ...prev, notes: event.target.value } : prev))}
          />
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="bg-blue-600 text-white px-4 py-2 rounded font-semibold disabled:opacity-60"
          >
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="bg-red-600 text-white px-4 py-2 rounded font-semibold disabled:opacity-60"
          >
            {deleting ? 'Excluindo...' : 'Excluir atividade'}
          </button>
          <span className="text-sm text-slate-500">Status atualizado para o time</span>
        </div>
      </section>

      <section className="bg-white border rounded-xl p-4 shadow">
        <h2 className="text-lg font-semibold mb-2">Timeline</h2>
        <ul className="space-y-3 text-sm">
          <li className="border rounded p-3">
            <div className="font-semibold">Atividade criada</div>
            <div className="text-slate-500">Criado por agente • hoje</div>
          </li>
          <li className="border rounded p-3">
            <div className="font-semibold">Observação adicionada</div>
            <div className="text-slate-500">Checklist atualizado • ontem</div>
          </li>
        </ul>
      </section>

      <section className="bg-white border rounded-xl p-4 shadow">
        <h2 className="text-lg font-semibold mb-2">Checklist</h2>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <input type="checkbox" checked readOnly />
            <span>Enviar resumo para o cliente</span>
          </li>
          <li className="flex items-center gap-2">
            <input type="checkbox" readOnly />
            <span>Confirmar próxima reunião</span>
          </li>
          <li className="flex items-center gap-2">
            <input type="checkbox" readOnly />
            <span>Atualizar status no CRM</span>
          </li>
        </ul>
      </section>
    </div>
  );
}








