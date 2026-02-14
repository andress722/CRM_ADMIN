"use client";
import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { endpoints } from '@/services/endpoints';
import { AuthService } from '@/services/auth';

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params?.id) ? params?.id[0] : params?.id;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const token = AuthService.getToken();
    if (!token) {
      setError('Usuário não autenticado.');
      setLoading(false);
      return;
    }
    fetch(endpoints.admin.customerDetail(id as string), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        setName(data.name);
        setEmail(data.email);
        setBlocked(data.blocked);
        setLoading(false);
      })
      .catch(() => {
        setError('Erro ao carregar cliente.');
        setLoading(false);
      });
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const token = AuthService.getToken();
    if (!token) {
      setError('Usuário não autenticado.');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(endpoints.admin.customerDetail(id as string), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, email, blocked }),
      });
      if (!res.ok) throw new Error('Erro ao salvar cliente');
      router.push('/customers');
    } catch {
      setError('Erro ao salvar cliente.');
    } finally {
      setLoading(false);
    }
  };

  const handleBlockToggle = async () => {
    setLoading(true);
    setError(null);
    const token = AuthService.getToken();
    if (!token) {
      setError('Usuário não autenticado.');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(endpoints.admin.customerDetail(id as string), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ blocked: !blocked }),
      });
      if (!res.ok) throw new Error('Erro ao atualizar status');
      setBlocked(!blocked);
    } catch {
      setError('Erro ao atualizar status.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Carregando cliente...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="max-w-lg mx-auto p-6 bg-white border rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-4">Editar Cliente</h1>
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Nome do cliente"
          value={name}
          onChange={e => setName(e.target.value)}
          className="border rounded px-2 py-1"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="border rounded px-2 py-1"
          required
        />
        {error && <div className="text-red-600">{error}</div>}
        <div className="flex gap-2">
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded font-bold" disabled={loading}>
            Salvar
          </button>
          <button type="button" className={`px-4 py-2 rounded font-bold ${blocked ? 'bg-green-600' : 'bg-red-600'} text-white`} onClick={handleBlockToggle} disabled={loading}>
            {blocked ? 'Desbloquear' : 'Bloquear'}
          </button>
        </div>
      </form>
    </div>
  );
}
