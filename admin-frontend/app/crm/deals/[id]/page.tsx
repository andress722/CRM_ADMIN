"use client";

import { useEffect, useMemo, useState } from 'react';
import { LoadingState, ErrorState } from '@/components/ui/AsyncState';
import { useParams, useRouter } from 'next/navigation';
import { AuthService } from '@/services/auth';
import { authFetch } from '@/services/auth-fetch';
import { endpoints } from '@/services/endpoints';
import BackButton from '@/components/BackButton';
import Select from '@/components/Select';
import DateInput from '@/components/DateInput';

const STAGES = ['Prospecting', 'Discovery', 'Proposal', 'Negotiation', 'Won', 'Lost'] as const;
const ACTIVITY_TYPES = ['Call', 'Email', 'Meeting', 'Task'] as const;

const STAGE_STYLES: Record<Stage, string> = {
  Prospecting: 'bg-blue-100 text-blue-700',
  Discovery: 'bg-indigo-100 text-indigo-700',
  Proposal: 'bg-amber-100 text-amber-700',
  Negotiation: 'bg-purple-100 text-purple-700',
  Won: 'bg-green-100 text-green-700',
  Lost: 'bg-red-100 text-red-700',
};

type Stage = (typeof STAGES)[number];
type ActivityType = (typeof ACTIVITY_TYPES)[number];

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

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params?.id) ? params?.id[0] : params?.id;

  const [deal, setDeal] = useState<Deal | null>(null);
  const [form, setForm] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [creatingActivity, setCreatingActivity] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activitySubject, setActivitySubject] = useState('');
  const [activityType, setActivityType] = useState<ActivityType>('Call');
  const [activityDueDate, setActivityDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const token = AuthService.getToken();
    if (!token) {
      setError('Usuário não autenticado.');
      setLoading(false);
      return;
    }
    authFetch(endpoints.admin.crmDealDetail(id), {
      headers: {},
    })
      .then((res) => res.json())
      .then((data) => {
        setDeal(data);
        setForm(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Erro ao carregar negócio.');
        setLoading(false);
      });
  }, [id]);

  const hasChanges = useMemo(() => JSON.stringify(deal) !== JSON.stringify(form), [deal, form]);

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
      const res = await authFetch(endpoints.admin.crmDealDetail(id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Erro ao salvar negócio');
      const updated = await res.json();
      setDeal(updated);
      setForm(updated);
    } catch {
      setError('Erro ao salvar negócio.');
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
      const res = await authFetch(endpoints.admin.crmDealDetail(id), {
        method: 'DELETE',
        headers: {},
      });
      if (!res.ok) throw new Error('Erro ao remover negócio');
      router.push('/crm/deals');
    } catch {
      setError('Erro ao remover negócio.');
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateActivity = async () => {
    if (!form) return;
    setCreatingActivity(true);
    setError(null);
    const token = AuthService.getToken();
    if (!token) {
      setError('Usuário não autenticado.');
      setCreatingActivity(false);
      return;
    }
    const payload = {
      subject: activitySubject || `Acompanhar ${form.title}`,
      owner: form.owner || 'Equipe CRM',
      contact: form.company,
      type: activityType,
      dueDate: activityDueDate || new Date().toISOString().slice(0, 10),
      status: 'Open',
      notes: `Negócio: ${form.title}`,
    };
    try {
      const res = await authFetch(endpoints.admin.crmActivities, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Erro ao criar atividade');
      setActivitySubject('');
      setActivityType('Call');
      setActivityDueDate('');
      setShowActivityForm(false);
    } catch {
      setError('Erro ao criar atividade.');
    } finally {
      setCreatingActivity(false);
    }
  };

  const handleSendEmail = async () => {
    if (!form) return;
    setSendingEmail(true);
    setError(null);
    const token = AuthService.getToken();
    if (!token) {
      setError('Usuário não autenticado.');
      setSendingEmail(false);
      return;
    }
    const payload = {
      subject: `Email sobre ${form.title}`,
      owner: form.owner || 'Equipe CRM',
      contact: form.company,
      type: 'Email',
      dueDate: new Date().toISOString().slice(0, 10),
      status: 'Open',
      notes: `Negócio: ${form.title}`,
    };
    try {
      const res = await authFetch(endpoints.admin.crmActivities, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Erro ao criar email');
    } catch {
      setError('Erro ao criar email.');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleCreateTask = async () => {
    if (!form) return;
    setCreatingTask(true);
    setError(null);
    const token = AuthService.getToken();
    if (!token) {
      setError('Usuário não autenticado.');
      setCreatingTask(false);
      return;
    }
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);
    const payload = {
      subject: `Tarefa: acompanhar ${form.title}`,
      owner: form.owner || 'Equipe CRM',
      contact: form.company,
      type: 'Task',
      dueDate: dueDate.toISOString().slice(0, 10),
      status: 'Open',
      notes: `Probabilidade: ${form.probability}%`,
    };
    try {
      const res = await authFetch(endpoints.admin.crmActivities, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Erro ao criar tarefa');
    } catch {
      setError('Erro ao criar tarefa.');
    } finally {
      setCreatingTask(false);
    }
  };

  if (loading) return <LoadingState message="Carregando negócio..." />;
  if (error) return <ErrorState message={error} />;
  if (!form) return <div className="p-6">Negócio não encontrado.</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <BackButton />
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{form.title}</h1>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STAGE_STYLES[form.stage]}`}>
                {form.stage}
              </span>
            </div>
            <p className="text-slate-500">Pipeline e previsão de fechamento.</p>
          </div>
        </div>
      </div>

      <section className="grid md:grid-cols-3 gap-4">
        <div className="bg-white border rounded-xl p-4 shadow">
          <p className="text-xs text-slate-500">Valor do negócio</p>
          <p className="text-lg font-semibold">R$ {form.value.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-white border rounded-xl p-4 shadow">
          <p className="text-xs text-slate-500">Probabilidade</p>
          <p className="text-lg font-semibold">{form.probability}%</p>
        </div>
        <div className="bg-white border rounded-xl p-4 shadow">
          <p className="text-xs text-slate-500">Fechamento esperado</p>
          <p className="text-lg font-semibold">{form.expectedClose || 'A definir'}</p>
        </div>
      </section>

      <section className="bg-white border rounded-xl p-4 shadow space-y-4">
        <h2 className="text-lg font-semibold">Detalhes do negócio</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <label className="space-y-1">
            <span className="text-sm text-slate-500">Título</span>
            <input
              className="border rounded px-3 py-2 w-full"
              value={form.title}
              onChange={(event) => setForm((prev) => (prev ? { ...prev, title: event.target.value } : prev))}
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-slate-500">Empresa</span>
            <input
              className="border rounded px-3 py-2 w-full"
              value={form.company}
              onChange={(event) => setForm((prev) => (prev ? { ...prev, company: event.target.value } : prev))}
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
            <span className="text-sm text-slate-500">Valor (R$)</span>
            <input
              type="number"
              className="border rounded px-3 py-2 w-full"
              value={form.value}
              onChange={(event) =>
                setForm((prev) => (prev ? { ...prev, value: Number(event.target.value || 0) } : prev))
              }
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-slate-500">Stage</span>
            <Select
              value={form.stage}
              onChange={(value) => setForm((prev) => (prev ? { ...prev, stage: value as Stage } : prev))}
              options={STAGES.map((stage) => ({ value: stage, label: stage }))}
              buttonClassName="border rounded px-3 py-2 w-full"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-slate-500">Probabilidade (%)</span>
            <input
              type="number"
              min="0"
              max="100"
              className="border rounded px-3 py-2 w-full"
              value={form.probability}
              onChange={(event) =>
                setForm((prev) => (prev ? { ...prev, probability: Number(event.target.value || 0) } : prev))
              }
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-slate-500">Fechamento esperado</span>
            <DateInput
              className="border rounded px-3 py-2 w-full"
              value={form.expectedClose}
              onChange={(value) => setForm((prev) => (prev ? { ...prev, expectedClose: value } : prev))}
              placeholder="YYYY-MM-DD"
            />
          </label>
        </div>
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
            {deleting ? 'Excluindo...' : 'Excluir negócio'}
          </button>
          <span className="text-sm text-slate-500">Forecast atualizado automaticamente</span>
        </div>
      </section>

      <section className="bg-white border rounded-xl p-4 shadow">
        <h2 className="text-lg font-semibold mb-2">Timeline</h2>
        <ul className="space-y-3 text-sm">
          <li className="border rounded p-3">
            <div className="font-semibold">Proposta enviada</div>
            <div className="text-slate-500">PDF enviado • 3 dias atrás</div>
          </li>
          <li className="border rounded p-3">
            <div className="font-semibold">Reunião agendada</div>
            <div className="text-slate-500">Calendário • ontem</div>
          </li>
        </ul>
      </section>

      <section className="bg-white border rounded-xl p-4 shadow">
        <h2 className="text-lg font-semibold mb-2">Relacionamentos</h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="border rounded p-3">
            <p className="text-xs text-slate-500">Contato principal</p>
            <p className="font-semibold">{form.company}</p>
            <p className="text-slate-500">Responsável: {form.owner}</p>
          </div>
          <div className="border rounded p-3">
            <p className="text-xs text-slate-500">Atividades recentes</p>
            <ul className="mt-2 space-y-1">
              <li>Call de alinhamento • ontem</li>
              <li>Email de proposta • 3 dias atrás</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-white border rounded-xl p-4 shadow">
        <h2 className="text-lg font-semibold mb-2">Ações rápidas</h2>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setShowActivityForm((prev) => !prev)}
            className="border px-4 py-2 rounded text-sm font-medium"
          >
            {showActivityForm ? 'Ocultar atividade' : 'Registrar atividade'}
          </button>
          <button
            type="button"
            onClick={handleSendEmail}
            disabled={sendingEmail}
            className="border px-4 py-2 rounded text-sm font-medium disabled:opacity-60"
          >
            {sendingEmail ? 'Enviando...' : 'Enviar email'}
          </button>
          <button
            type="button"
            onClick={handleCreateTask}
            disabled={creatingTask}
            className="border px-4 py-2 rounded text-sm font-medium disabled:opacity-60"
          >
            {creatingTask ? 'Criando...' : 'Criar tarefa'}
          </button>
        </div>
        {showActivityForm && (
          <div className="mt-4 grid md:grid-cols-3 gap-3">
            <input
              className="border rounded px-3 py-2"
              placeholder="Assunto"
              value={activitySubject}
              onChange={(event) => setActivitySubject(event.target.value)}
            />
            <Select
              value={activityType}
              onChange={(value) => setActivityType(value as ActivityType)}
              options={ACTIVITY_TYPES.map((type) => ({ value: type, label: type }))}
              buttonClassName="border rounded px-3 py-2"
            />
            <DateInput
              className="border rounded px-3 py-2"
              value={activityDueDate}
              onChange={setActivityDueDate}
              placeholder="YYYY-MM-DD"
            />
            <button
              type="button"
              onClick={handleCreateActivity}
              disabled={creatingActivity}
              className="md:col-span-3 bg-blue-600 text-white px-4 py-2 rounded font-semibold disabled:opacity-60"
            >
              {creatingActivity ? 'Criando...' : 'Confirmar atividade'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}








