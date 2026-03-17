"use client";

import { useEffect, useMemo, useState } from 'react';
import { LoadingState, ErrorState } from '@/components/ui/AsyncState';
import { useParams, useRouter } from 'next/navigation';
import { authFetch } from '@/services/auth-fetch';
import { endpoints } from '@/services/endpoints';
import BackButton from '@/components/BackButton';
import Select from '@/components/Select';
import DateInput from '@/components/DateInput';

const SOURCES = ['Website', 'Instagram', 'Ads', 'Referral', 'Outbound'] as const;
const STATUSES = ['New', 'Qualified', 'Contacted', 'Unqualified'] as const;
const ACTIVITY_TYPES = ['Call', 'Email', 'Meeting', 'Task'] as const;

const STATUS_STYLES: Record<LeadStatus, string> = {
  New: 'bg-blue-100 text-blue-700',
  Qualified: 'bg-green-100 text-green-700',
  Contacted: 'bg-amber-100 text-amber-700',
  Unqualified: 'bg-red-100 text-red-700',
};

type LeadStatus = (typeof STATUSES)[number];
type ActivityType = (typeof ACTIVITY_TYPES)[number];

type Lead = {
  id: string;
  name: string;
  email: string;
  company: string;
  value: number;
  source: (typeof SOURCES)[number];
  status: LeadStatus;
  createdAt?: string;
};


const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback;
  const e = error as { message?: string; response?: { data?: { message?: string } } };
  return e.response?.data?.message || e.message || fallback;
}

function validateLeadForm(input: Lead): string | null {
  const name = input.name.trim();
  const email = input.email.trim();
  const company = input.company.trim();

  if (name.length < 3 || name.length > 120) return 'Nome deve ter entre 3 e 120 caracteres.';
  if (!EMAIL_PATTERN.test(email)) return 'Email invalido.';
  if (company.length < 2 || company.length > 120) return 'Empresa deve ter entre 2 e 120 caracteres.';
  if (!Number.isFinite(input.value) || input.value < 0) return 'Valor deve ser maior ou igual a zero.';

  return null;
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params?.id) ? params?.id[0] : params?.id;

  const [lead, setLead] = useState<Lead | null>(null);
  const [form, setForm] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [creatingActivity, setCreatingActivity] = useState(false);
  const [converting, setConverting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [showConvertForm, setShowConvertForm] = useState(false);
  const [activitySubject, setActivitySubject] = useState('');
  const [activityType, setActivityType] = useState<ActivityType>('Call');
  const [activityDueDate, setActivityDueDate] = useState('');
  const [dealTitle, setDealTitle] = useState('');
  const [dealExpectedClose, setDealExpectedClose] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;    authFetch(endpoints.admin.crmLeadDetail(id), {
      headers: {},
    })
      .then((res) => res.json())
      .then((data) => {
        setLead(data);
        setForm(data);
        setDealTitle((prev) => prev || `${data.name} - ${data.company}`.trim());
        setLoading(false);
      })
      .catch(() => {
        setError('Erro ao carregar lead.');
        setLoading(false);
      });
  }, [id]);

  const hasChanges = useMemo(() => JSON.stringify(lead) !== JSON.stringify(form), [lead, form]);

  const handleSave = async () => {
    if (!form || !id) return;
    const validationError = validateLeadForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(null);    try {
      const res = await authFetch(endpoints.admin.crmLeadDetail(id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Erro ao salvar lead');
      const updated = await res.json();
      setLead(updated);
      setForm(updated);
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao salvar lead.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm('Tem certeza que deseja excluir este lead?')) return;
    setDeleting(true);
    setError(null);    try {
      const res = await authFetch(endpoints.admin.crmLeadDetail(id), {
        method: 'DELETE',
        headers: {},
      });
      if (!res.ok) throw new Error('Erro ao remover lead');
      router.push('/crm/leads');
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao remover lead.'));
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateActivity = async () => {
    if (!form) return;
    setCreatingActivity(true);
    setError(null);    const payload = {
      subject: activitySubject || `Follow-up ${form.name}`,
      owner: 'Equipe CRM',
      contact: form.name,
      type: activityType,
      dueDate: activityDueDate || new Date().toISOString().slice(0, 10),
      status: 'Open',
      notes: form.email ? `Lead: ${form.email}` : undefined,
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
    setError(null);    const payload = {
      subject: `Email para ${form.name}`,
      owner: 'Equipe CRM',
      contact: form.name,
      type: 'Email',
      dueDate: new Date().toISOString().slice(0, 10),
      status: 'Open',
      notes: form.email ? `Destinatário: ${form.email}` : undefined,
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
    setError(null);    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);
    const payload = {
      subject: `Tarefa: follow-up ${form.name}`,
      owner: 'Equipe CRM',
      contact: form.name,
      type: 'Task',
      dueDate: dueDate.toISOString().slice(0, 10),
      status: 'Open',
      notes: form.company ? `Empresa: ${form.company}` : undefined,
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

  const handleConvertLead = async () => {
    if (!form) return;
    setConverting(true);
    setError(null);    const payload = {
      title: dealTitle || `${form.name} - ${form.company}`.trim(),
      company: form.company,
      owner: 'Equipe CRM',
      value: form.value || 0,
      stage: 'Prospecting',
      probability: 20,
      expectedClose: dealExpectedClose,
    };
    try {
      const res = await authFetch(endpoints.admin.crmDeals, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Erro ao converter lead');
      const created = await res.json();
      if (created?.id) {
        router.push(`/crm/deals/${created.id}`);
      } else {
        router.push('/crm/deals');
      }
    } catch {
      setError('Erro ao converter lead.');
    } finally {
      setConverting(false);
    }
  };

  if (loading) return <LoadingState message="Carregando lead..." />;
  if (error) return <ErrorState message={error} />;
  if (!form) return <div className="p-6">Lead não encontrado.</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <BackButton />
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Lead {form.name}</h1>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_STYLES[form.status]}`}>
                {form.status}
              </span>
            </div>
            <p className="text-slate-500">Detalhes completos e histórico.</p>
          </div>
        </div>
      </div>

      <section className="grid md:grid-cols-3 gap-4">
        <div className="bg-white border rounded-xl p-4 shadow">
          <p className="text-xs text-slate-500">Valor estimado</p>
          <p className="text-lg font-semibold">R$ {form.value.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-white border rounded-xl p-4 shadow">
          <p className="text-xs text-slate-500">Origem</p>
          <p className="text-lg font-semibold">{form.source}</p>
        </div>
        <div className="bg-white border rounded-xl p-4 shadow">
          <p className="text-xs text-slate-500">Última atualização</p>
          <p className="text-lg font-semibold">
            {form.createdAt ? new Date(form.createdAt).toLocaleDateString('pt-BR') : 'Hoje'}
          </p>
        </div>
      </section>

      <section className="bg-white border rounded-xl p-4 shadow space-y-4">
        <h2 className="text-lg font-semibold">Informações principais</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <label className="space-y-1">
            <span className="text-sm text-slate-500">Nome</span>
            <input
              className="border rounded px-3 py-2 w-full"
              value={form.name}
              onChange={(event) => setForm((prev) => (prev ? { ...prev, name: event.target.value } : prev))}
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-slate-500">Email</span>
            <input
              className="border rounded px-3 py-2 w-full"
              value={form.email}
              onChange={(event) => setForm((prev) => (prev ? { ...prev, email: event.target.value } : prev))}
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
            <span className="text-sm text-slate-500">Valor estimado (R$)</span>
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
            <span className="text-sm text-slate-500">Origem</span>
            <Select
              value={form.source}
              onChange={(value) =>
                setForm((prev) => (prev ? { ...prev, source: value as Lead['source'] } : prev))
              }
              options={SOURCES.map((source) => ({ value: source, label: source }))}
              buttonClassName="border rounded px-3 py-2 w-full"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-slate-500">Status</span>
            <Select
              value={form.status}
              onChange={(value) =>
                setForm((prev) => (prev ? { ...prev, status: value as LeadStatus } : prev))
              }
              options={STATUSES.map((status) => ({ value: status, label: status }))}
              buttonClassName="border rounded px-3 py-2 w-full"
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
            {deleting ? 'Excluindo...' : 'Excluir lead'}
          </button>
          <span className="text-sm text-slate-500">Atualizado em tempo real no CRM</span>
        </div>
      </section>

      <section className="bg-white border rounded-xl p-4 shadow">
        <h2 className="text-lg font-semibold mb-2">Timeline</h2>
        <ul className="space-y-3 text-sm">
          <li className="border rounded p-3">
            <div className="font-semibold">Contato inicial enviado</div>
            <div className="text-slate-500">Email automático • 2 dias atrás</div>
          </li>
          <li className="border rounded p-3">
            <div className="font-semibold">Lead qualificado</div>
            <div className="text-slate-500">Marcado por SDR • ontem</div>
          </li>
        </ul>
      </section>

      <section className="bg-white border rounded-xl p-4 shadow">
        <h2 className="text-lg font-semibold mb-2">Próximas ações</h2>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setShowActivityForm((prev) => !prev)}
            className="border px-4 py-2 rounded text-sm font-medium"
          >
            {showActivityForm ? 'Ocultar atividade' : 'Agendar atividade'}
          </button>
          <button
            type="button"
            onClick={() => setShowConvertForm((prev) => !prev)}
            className="border px-4 py-2 rounded text-sm font-medium"
          >
            {showConvertForm ? 'Ocultar conversão' : 'Converter em negócio'}
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
        {showConvertForm && (
          <div className="mt-4 grid md:grid-cols-3 gap-3">
            <input
              className="border rounded px-3 py-2 md:col-span-2"
              placeholder="Título do negócio"
              value={dealTitle}
              onChange={(event) => setDealTitle(event.target.value)}
            />
            <DateInput
              className="border rounded px-3 py-2"
              value={dealExpectedClose}
              onChange={setDealExpectedClose}
              placeholder="YYYY-MM-DD"
            />
            <button
              type="button"
              onClick={handleConvertLead}
              disabled={converting}
              className="md:col-span-3 bg-emerald-600 text-white px-4 py-2 rounded font-semibold disabled:opacity-60"
            >
              {converting ? 'Convertendo...' : 'Confirmar conversão'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}












