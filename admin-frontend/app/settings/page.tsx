"use client";

import React, { useState, useEffect } from 'react';

import { LoadingState, ErrorState } from '@/components/ui/AsyncState';
import { endpoints } from '@/services/endpoints';
import { AuthService } from '@/services/auth';
import { authFetch } from '@/services/auth-fetch';
import { ApiRecord } from '@/types';

type SettingsState = ApiRecord & {
  storeName?: string;
  contactEmail?: string;
  maintenance?: boolean;
  defaultDarkMode?: boolean;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = AuthService.getToken();
    if (!token) {
      setError('Usuário não autenticado.');
      setLoading(false);
      return;
    }
    authFetch(endpoints.admin.settings, {
      headers: {},
    })
      .then(res => res.json())
      .then(data => {
        setSettings(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Erro ao carregar configurações.');
        setLoading(false);
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await authFetch(endpoints.admin.settings, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
    } catch {
      setError('Erro ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState message="Carregando configurações..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="max-w-xl mx-auto p-6 bg-white border rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-4">Configurações Gerais</h1>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="font-semibold">Nome da loja</label>
          <input
            type="text"
            name="storeName"
            value={settings.storeName || ''}
            onChange={handleChange}
            className="border rounded px-2 py-1 w-full"
            required
          />
        </div>
        <div>
          <label className="font-semibold">Email de contato</label>
          <input
            type="email"
            name="contactEmail"
            value={settings.contactEmail || ''}
            onChange={handleChange}
            className="border rounded px-2 py-1 w-full"
            required
          />
        </div>
        <div>
          <label className="font-semibold">Ativar manutenção</label>
          <input
            type="checkbox"
            name="maintenance"
            checked={!!settings.maintenance}
            onChange={handleChange}
            className="ml-2"
          />
        </div>
        <div>
          <label className="font-semibold">Tema escuro padrão</label>
          <input
            type="checkbox"
            name="defaultDarkMode"
            checked={!!settings.defaultDarkMode}
            onChange={handleChange}
            className="ml-2"
          />
        </div>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded font-semibold" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar configurações'}
        </button>
      </form>
    </div>
  );
}









