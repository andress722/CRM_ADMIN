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

const SEGMENTS = ['VIP', 'High Value', 'At Risk', 'New'] as const;
const ACTIVITY_TYPES = ['Call', 'Email', 'Meeting', 'Task'] as const;

const SEGMENT_STYLES: Record<Contact['segment'], string> = {
  VIP: 'bg-purple-100 text-purple-700',
  'High Value': 'bg-green-100 text-green-700',
  'At Risk': 'bg-red-100 text-red-700',
  New: 'bg-blue-100 text-blue-700',
};

type Contact = {
  id: string;
  name: string;
  email: string;
  company: string;
  segment: (typeof SEGMENTS)[number];
  lastTouch: string;
  lifecycle: string;
  notes?: string;
};
type ActivityType = (typeof ACTIVITY_TYPES)[number];


const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback;
  const e = error as { message?: string; response?: { data?: { message?: string } } };
  return e.response?.data?.message || e.message || fallback;
}

function validateContactForm(input: Contact): string | null {
  const name = input.name.trim();
  const email = input.email.trim();
  const company = input.company.trim();
  const lifecycle = input.lifecycle.trim();

  if (name.length < 3 || name.length > 120) return 'Nome deve ter entre 3 e 120 caracteres.';
  if (!EMAIL_PATTERN.test(email)) return 'Email invalido.';
  if (company.length < 2 || company.length > 120) return 'Empresa deve ter entre 2 e 120 caracteres.';
  if (lifecycle.length < 2 || lifecycle.length > 80) return 'Lifecycle deve ter entre 2 e 80 caracteres.';
  return null;
}

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params?.id) ? params?.id[0] : params?.id;

  const [contact, setContact] = useState<Contact | null>(null);
  const [form, setForm] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [creatingActivity, setCreatingActivity] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [activitySubject, setActivitySubject] = useState('');
  const [activityType, setActivityType] = useState<ActivityType>('Call');
  const [activityDueDate, setActivityDueDate] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const token = AuthService.getToken();
    if (!token) {
      setError('Usuário não autenticado.');
      setLoading(false);
      return;
    }
    authFetch(endpoints.admin.crmContactDetail(id), {
      headers: {},
    })
      .then((res) => res.json())
      .then((data) => {
        setContact(data);
        setForm(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Erro ao carregar contato.');
        setLoading(false);
      });
  }, [id]);

  const hasChanges = useMemo(() => JSON.stringify(contact) !== JSON.stringify(form), [contact, form]);

  const handleSave = async () => {
    if (!form || !id) return;
    const validationError = validateContactForm(form);
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
      const res = await authFetch(endpoints.admin.crmContactDetail(id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Erro ao salvar contato');
      const updated = await res.json();
      setContact(updated);
      setForm(updated);
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao salvar contato.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm('Tem certeza que deseja excluir este contato?')) return;
    setDeleting(true);
    setError(null);
    const token = AuthService.getToken();
    if (!token) {
      setError('Usuário não autenticado.');
      setDeleting(false);
      return;
    }
    try {
      const res = await authFetch(endpoints.admin.crmContactDetail(id), {
        method: 'DELETE',
        headers: {},
      });
      if (!res.ok) throw new Error('Erro ao remover contato');
      router.push('/crm/contacts');
    } catch (err) {
      setError(getErrorMessage(err, 'Erro ao remover contato.'));
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
      subject: activitySubject || `Contato ${form.name}`,
      owner: 'Equipe CRM',
      contact: form.name,
      type: activityType,
      dueDate: activityDueDate || new Date().toISOString().slice(0, 10),
      status: 'Open',
      notes: form.email ? `Contato: ${form.email}` : undefined,
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

  const handleAddNote = async () => {
    if (!form || !id || !noteDraft.trim()) return;
    setSavingNote(true);
    setError(null);
    const token = AuthService.getToken();
    if (!token) {
      setError('Usuário não autenticado.');
      setSavingNote(false);
      return;
    }
    const updatedNotes = [form.notes, noteDraft.trim()].filter(Boolean).join('\n\n');
    try {
      const res = await authFetch(endpoints.admin.crmContactDetail(id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...form, notes: updatedNotes }),
      });
      if (!res.ok) throw new Error('Erro ao salvar nota');
      const updated = await res.json();
      setContact(updated);
      setForm(updated);
      setNoteDraft('');
    } catch {
      setError('Erro ao salvar nota.');
    } finally {
      setSavingNote(false);
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
    setError(null);
    const token = AuthService.getToken();
    if (!token) {
      setError('Usuário não autenticado.');
      setCreatingTask(false);
      return;
    }
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 2);
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

  if (loading) return <LoadingState message="Carregando contato..." />;
  if (error) return <ErrorState message={error} />;
  if (!form) return <div className="p-6">Contato não encontrado.</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <BackButton />
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{form.name}</h1>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${SEGMENT_STYLES[form.segment]}`}>
                {form.segment}
              </span>
            </div>
            <p className="text-slate-500">Dados do contato e relacionamento.</p>
          </div>
        </div>
      </div>

      <section className="grid md:grid-cols-3 gap-4">
        <div className="bg-white border rounded-xl p-4 shadow">
          <p className="text-xs text-slate-500">Segmento</p>
          <p className="text-lg font-semibold">{form.segment}</p>
        </div>
        <div className="bg-white border rounded-xl p-4 shadow">
          <p className="text-xs text-slate-500">Último toque</p>
          <p className="text-lg font-semibold">{form.lastTouch || 'A definir'}</p>
        </div>
        <div className="bg-white border rounded-xl p-4 shadow">
          <p className="text-xs text-slate-500">Lifecycle</p>
          <p className="text-lg font-semibold">{form.lifecycle}</p>
        </div>
      </section>

      <section className="bg-white border rounded-xl p-4 shadow space-y-4">
        <h2 className="text-lg font-semibold">Perfil do contato</h2>
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
            <span className="text-sm text-slate-500">Segmento</span>
            <Select
              value={form.segment}
              onChange={(value) =>
                setForm((prev) => (prev ? { ...prev, segment: value as Contact['segment'] } : prev))
              }
              options={SEGMENTS.map((segment) => ({ value: segment, label: segment }))}
              buttonClassName="border rounded px-3 py-2 w-full"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-slate-500">Lifecycle</span>
            <input
              className="border rounded px-3 py-2 w-full"
              value={form.lifecycle}
              onChange={(event) => setForm((prev) => (prev ? { ...prev, lifecycle: event.target.value } : prev))}
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-slate-500">Último toque</span>
            <DateInput
              value={form.lastTouch}
              onChange={(value) => setForm((prev) => (prev ? { ...prev, lastTouch: value } : prev))}
              className="w-full"
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
            {deleting ? 'Excluindo...' : 'Excluir contato'}
          </button>
          <span className="text-sm text-slate-500">Dados sincronizados com CRM</span>
        </div>
      </section>

      <section className="bg-white border rounded-xl p-4 shadow">
        <h2 className="text-lg font-semibold mb-2">Timeline</h2>
        <ul className="space-y-3 text-sm">
          <li className="border rounded p-3">
            <div className="font-semibold">Última interação registrada</div>
            <div className="text-slate-500">Email enviado • 2 dias atrás</div>
          </li>
          <li className="border rounded p-3">
            <div className="font-semibold">Reunião concluída</div>
            <div className="text-slate-500">Resumo salvo • semana passada</div>
          </li>
        </ul>
      </section>

      <section className="bg-white border rounded-xl p-4 shadow space-y-4">
        <h2 className="text-lg font-semibold">Ações rápidas</h2>
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
          <div className="grid md:grid-cols-3 gap-3">
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
            <DateInput value={activityDueDate} onChange={setActivityDueDate} />
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
        <div>
          <label className="space-y-1 block">
            <span className="text-sm text-slate-500">Adicionar nota</span>
            <textarea
              className="border rounded px-3 py-2 w-full"
              rows={3}
              value={noteDraft}
              onChange={(event) => setNoteDraft(event.target.value)}
              placeholder="Escreva uma nota rápida para este contato"
            />
          </label>
          <button
            type="button"
            onClick={handleAddNote}
            disabled={!noteDraft.trim() || savingNote}
            className="mt-2 bg-emerald-600 text-white px-4 py-2 rounded font-semibold disabled:opacity-60"
          >
            {savingNote ? 'Salvando...' : 'Salvar nota'}
          </button>
        </div>
      </section>

      <section className="bg-white border rounded-xl p-4 shadow">
        <h2 className="text-lg font-semibold mb-2">Relacionamentos</h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="border rounded p-3">
            <p className="text-xs text-slate-500">Negócios em aberto</p>
            <ul className="mt-2 space-y-1">
              <li>Plano enterprise • Em negociação</li>
              <li>Onboarding premium • Proposta</li>
            </ul>
          </div>
          <div className="border rounded p-3">
            <p className="text-xs text-slate-500">Atividades recentes</p>
            <ul className="mt-2 space-y-1">
              <li>Reunião de follow-up • ontem</li>
              <li>WhatsApp enviado • 3 dias atrás</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}










