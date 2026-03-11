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

const STAGE_STYLES: Record<(typeof STAGES)[number], string> = {
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

type Activity = {
  id: string;
  subject: string;
  owner: string;
  contact: string;
  type: string;
  status: string;
  dueDate?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type Contact = {
  id: string;
  name: string;
  email: string;
  company: string;
  owner: string;
  lifecycle: string;
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback;
  const e = error as { message?: string; response?: { data?: { message?: string } } };
  return e.response?.data?.message || e.message || fallback;
}

function validateDealForm(input: Deal): string | null {
  const title = input.title.trim();
  const company = input.company.trim();
  const owner = input.owner.trim();

  if (title.length < 3 || title.length > 160) return 'Titulo deve ter entre 3 e 160 caracteres.';
  if (company.length < 2 || company.length > 120) return 'Empresa deve ter entre 2 e 120 caracteres.';
  if (owner.length < 2 || owner.length > 120) return 'Responsavel deve ter entre 2 e 120 caracteres.';
  if (!Number.isFinite(input.value) || input.value < 0) return 'Valor deve ser maior ou igual a zero.';
  if (!Number.isFinite(input.probability) || input.probability < 0 || input.probability > 100) {
    return 'Probabilidade deve estar entre 0 e 100.';
  }

  return null;
}

function formatDateLabel(value?: string | null): string {
  if (!value) return 'Data nao informada';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR');
}

function normalizeText(value?: string | null): string {
  return (value || '').trim().toLowerCase();
}

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
  const [activities, setActivities] = useState<Activity[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadRelatedData = async (currentDeal: Deal) => {
    const [activitiesRes, contactsRes] = await Promise.all([
      authFetch(endpoints.admin.crmActivities, { headers: {} }),
      authFetch(endpoints.admin.crmContacts, { headers: {} }),
    ]);

    const activitiesData = activitiesRes.ok ? await activitiesRes.json() : [];
    const contactsData = contactsRes.ok ? await contactsRes.json() : [];

    const company = normalizeText(currentDeal.company);
    const title = normalizeText(currentDeal.title);

    const mappedActivities: Activity[] = Array.isArray(activitiesData) ? activitiesData : [];
    const mappedContacts: Contact[] = Array.isArray(contactsData) ? contactsData : [];

    const filteredActivities = mappedActivities.filter((activity) => {
      const activityContact = normalizeText(activity.contact);
      const activitySubject = normalizeText(activity.subject);
      return activityContact === company || activitySubject.includes(title) || activitySubject.includes(company);
    });

    const relatedContacts = mappedContacts.filter((contact) => normalizeText(contact.company) === company);

    setActivities(filteredActivities);
    setContacts(relatedContacts);
  };

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
      .then(async (data) => {
        setDeal(data);
        setForm(data);
        await loadRelatedData(data);
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
    const validationError = validateDealForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }
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
      await loadRelatedData(updated);
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao salvar negócio.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm('Tem certeza que deseja excluir este negócio?')) return;
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
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao remover negócio.'));
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
      await loadRelatedData(form);
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
      await loadRelatedData(form);
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
      await loadRelatedData(form);
    } catch {
      setError('Erro ao criar tarefa.');
    } finally {
      setCreatingTask(false);
    }
  };

  if (loading) return <LoadingState message="Carregando negócio..." />;
  if (error) return <ErrorState message={error} />;
  if (!form) return <div className="p-6">Negócio não encontrado.</div>;

  const timelineItems = [...activities].sort((a, b) => {
    const aDate = new Date(a.updatedAt || a.dueDate || a.createdAt || 0).getTime();
    const bDate = new Date(b.updatedAt || b.dueDate || b.createdAt || 0).getTime();
    return bDate - aDate;
  });

  const recentActivities = timelineItems.slice(0, 5);
  const primaryContact = contacts[0];

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
          {timelineItems.length === 0 ? (
            <li className="border rounded p-3 text-slate-500">Sem atividades registradas para este negócio.</li>
          ) : (
            timelineItems.slice(0, 8).map((activity) => (
              <li key={activity.id} className="border rounded p-3">
                <div className="font-semibold">{activity.subject}</div>
                <div className="text-slate-500">
                  {activity.type} • {activity.status} • {formatDateLabel(activity.dueDate || activity.updatedAt || activity.createdAt)}
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="bg-white border rounded-xl p-4 shadow">
        <h2 className="text-lg font-semibold mb-2">Relacionamentos</h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="border rounded p-3">
            <p className="text-xs text-slate-500">Contato principal</p>
            {primaryContact ? (
              <>
                <p className="font-semibold">{primaryContact.name}</p>
                <p className="text-slate-500">{primaryContact.email}</p>
                <p className="text-slate-500">Lifecycle: {primaryContact.lifecycle}</p>
              </>
            ) : (
              <p className="text-slate-500">Nenhum contato cadastrado para esta empresa.</p>
            )}
          </div>
          <div className="border rounded p-3">
            <p className="text-xs text-slate-500">Atividades recentes</p>
            <ul className="mt-2 space-y-1">
              {recentActivities.length === 0 ? (
                <li className="text-slate-500">Sem atividades recentes.</li>
              ) : (
                recentActivities.map((activity) => (
                  <li key={activity.id}>
                    {activity.subject} • {formatDateLabel(activity.dueDate || activity.updatedAt || activity.createdAt)}
                  </li>
                ))
              )}
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
