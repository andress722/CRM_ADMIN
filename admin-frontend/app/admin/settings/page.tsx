'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useApiMutation, useApiQuery } from '@/hooks/useApi';
import { endpoints } from '@/services/endpoints';
import { useToast } from '@/contexts/ToastContext';

type AdminSettings = {
  storeName: string;
  contactEmail: string;
  maintenance: boolean;
  defaultDarkMode: boolean;
};

type AdminProfile = {
  name: string;
  email: string;
  avatar: string;
  preferences: Record<string, unknown>;
};

type AdminIntegration = {
  id: string;
  name: string;
  provider: string;
  status: string;
  apiKey: string;
  type: string;
};

export default function SettingsPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading: isSettingsLoading } = useApiQuery<AdminSettings>(
    ['admin-settings'],
    endpoints.admin.settings
  );
  const { data: profile, isLoading: isProfileLoading } = useApiQuery<AdminProfile>(
    ['admin-profile'],
    endpoints.admin.profile
  );
  const { data: integrations, isLoading: isIntegrationsLoading } = useApiQuery<AdminIntegration[]>(
    ['admin-integrations'],
    endpoints.admin.integrations
  );

  const saveSettingsMutation = useApiMutation<AdminSettings, AdminSettings>('put');
  const saveProfileMutation = useApiMutation<AdminProfile, AdminProfile>('put');
  const createIntegrationMutation = useApiMutation<AdminIntegration, AdminIntegration>('post');
  const updateIntegrationMutation = useApiMutation<AdminIntegration, AdminIntegration>('put');
  const deleteIntegrationMutation = useApiMutation<{ success: boolean }>('delete');

  const [settingsForm, setSettingsForm] = useState<AdminSettings>({
    storeName: '',
    contactEmail: '',
    maintenance: false,
    defaultDarkMode: false,
  });
  const [profileForm, setProfileForm] = useState<AdminProfile>({
    name: '',
    email: '',
    avatar: '',
    preferences: {},
  });
  const [newIntegration, setNewIntegration] = useState<AdminIntegration>({
    id: '',
    name: '',
    provider: '',
    status: 'active',
    apiKey: '',
    type: 'custom',
  });
  const [editingIntegrationId, setEditingIntegrationId] = useState<string | null>(null);
  const [integrationDraft, setIntegrationDraft] = useState<AdminIntegration | null>(null);

  useEffect(() => {
    if (settings) {
      setSettingsForm(settings);
    }
  }, [settings]);

  useEffect(() => {
    if (profile) {
      setProfileForm(profile);
    }
  }, [profile]);

  const saveSettings = async () => {
    try {
      await saveSettingsMutation.mutateAsync({
        url: endpoints.admin.settings,
        data: settingsForm,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      addToast('✅ Configuracoes salvas', 'success');
    } catch {
      addToast('❌ Erro ao salvar configuracoes', 'error');
    }
  };

  const saveProfile = async () => {
    try {
      await saveProfileMutation.mutateAsync({
        url: endpoints.admin.profile,
        data: profileForm,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-profile'] });
      addToast('✅ Perfil atualizado', 'success');
    } catch {
      addToast('❌ Erro ao atualizar perfil', 'error');
    }
  };

  const createIntegration = async () => {
    if (!newIntegration.name.trim() || !newIntegration.provider.trim()) {
      addToast('❌ Nome e provedor sao obrigatorios', 'error');
      return;
    }

    try {
      await createIntegrationMutation.mutateAsync({
        url: endpoints.admin.integrations,
        data: {
          ...newIntegration,
          id: '',
        },
      });
      setNewIntegration({
        id: '',
        name: '',
        provider: '',
        status: 'active',
        apiKey: '',
        type: 'custom',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-integrations'] });
      addToast('✅ Integracao criada', 'success');
    } catch {
      addToast('❌ Erro ao criar integracao', 'error');
    }
  };

  const saveIntegrationEdit = async () => {
    if (!editingIntegrationId || !integrationDraft) {
      return;
    }

    try {
      await updateIntegrationMutation.mutateAsync({
        url: `${endpoints.admin.integrations}/${editingIntegrationId}`,
        data: integrationDraft,
      });
      setEditingIntegrationId(null);
      setIntegrationDraft(null);
      queryClient.invalidateQueries({ queryKey: ['admin-integrations'] });
      addToast('✅ Integracao atualizada', 'success');
    } catch {
      addToast('❌ Erro ao atualizar integracao', 'error');
    }
  };

  const removeIntegration = async (id: string) => {
    if (!confirm('Remover esta integracao?')) {
      return;
    }

    try {
      await deleteIntegrationMutation.mutateAsync({
        url: `${endpoints.admin.integrations}/${id}`,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-integrations'] });
      addToast('✅ Integracao removida', 'success');
    } catch {
      addToast('❌ Erro ao remover integracao', 'error');
    }
  };

  const isLoading = isSettingsLoading || isProfileLoading || isIntegrationsLoading;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">Configure system, profile and integrations</p>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-slate-800 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && (
        <>
          <section className="rounded-lg border border-white/10 bg-slate-800/50 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Store Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-1">
                <span className="text-sm text-slate-300">Store name</span>
                <input
                  value={settingsForm.storeName}
                  onChange={(e) => setSettingsForm((s) => ({ ...s, storeName: e.target.value }))}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-slate-300">Contact email</span>
                <input
                  type="email"
                  value={settingsForm.contactEmail}
                  onChange={(e) => setSettingsForm((s) => ({ ...s, contactEmail: e.target.value }))}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white"
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={settingsForm.maintenance}
                  onChange={(e) => setSettingsForm((s) => ({ ...s, maintenance: e.target.checked }))}
                />
                Maintenance mode
              </label>
              <label className="flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={settingsForm.defaultDarkMode}
                  onChange={(e) => setSettingsForm((s) => ({ ...s, defaultDarkMode: e.target.checked }))}
                />
                Default dark mode
              </label>
            </div>
            <button
              onClick={saveSettings}
              disabled={saveSettingsMutation.isPending}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white"
            >
              {saveSettingsMutation.isPending ? 'Saving...' : 'Save settings'}
            </button>
          </section>

          <section className="rounded-lg border border-white/10 bg-slate-800/50 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Admin Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="space-y-1">
                <span className="text-sm text-slate-300">Name</span>
                <input
                  value={profileForm.name}
                  onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-slate-300">Email</span>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-slate-300">Avatar URL</span>
                <input
                  value={profileForm.avatar}
                  onChange={(e) => setProfileForm((p) => ({ ...p, avatar: e.target.value }))}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white"
                />
              </label>
            </div>
            <button
              onClick={saveProfile}
              disabled={saveProfileMutation.isPending}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white"
            >
              {saveProfileMutation.isPending ? 'Saving...' : 'Save profile'}
            </button>
          </section>

          <section className="rounded-lg border border-white/10 bg-slate-800/50 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Integrations</h2>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
              <input
                placeholder="Name"
                value={newIntegration.name}
                onChange={(e) => setNewIntegration((i) => ({ ...i, name: e.target.value }))}
                className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white md:col-span-1"
              />
              <input
                placeholder="Provider"
                value={newIntegration.provider}
                onChange={(e) => setNewIntegration((i) => ({ ...i, provider: e.target.value }))}
                className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white md:col-span-1"
              />
              <input
                placeholder="Type"
                value={newIntegration.type}
                onChange={(e) => setNewIntegration((i) => ({ ...i, type: e.target.value }))}
                className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white md:col-span-1"
              />
              <select
                value={newIntegration.status}
                onChange={(e) => setNewIntegration((i) => ({ ...i, status: e.target.value }))}
                className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white md:col-span-1"
              >
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
              <input
                placeholder="API key"
                value={newIntegration.apiKey}
                onChange={(e) => setNewIntegration((i) => ({ ...i, apiKey: e.target.value }))}
                className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-white md:col-span-1"
              />
              <button
                onClick={createIntegration}
                disabled={createIntegrationMutation.isPending}
                className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-3 py-2 md:col-span-1"
              >
                Add
              </button>
            </div>

            <div className="border border-slate-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-900/70">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm text-slate-300">Name</th>
                    <th className="px-4 py-2 text-left text-sm text-slate-300">Provider</th>
                    <th className="px-4 py-2 text-left text-sm text-slate-300">Type</th>
                    <th className="px-4 py-2 text-left text-sm text-slate-300">Status</th>
                    <th className="px-4 py-2 text-right text-sm text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(integrations ?? []).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                        No integrations found
                      </td>
                    </tr>
                  )}
                  {(integrations ?? []).map((integration) => {
                    const isEditing = editingIntegrationId === integration.id;
                    const item = isEditing && integrationDraft ? integrationDraft : integration;

                    return (
                      <tr key={integration.id} className="border-t border-slate-700">
                        <td className="px-4 py-2">
                          <input
                            disabled={!isEditing}
                            value={item.name}
                            onChange={(e) => setIntegrationDraft((d) => (d ? { ...d, name: e.target.value } : d))}
                            className="w-full rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm text-white disabled:opacity-80"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            disabled={!isEditing}
                            value={item.provider}
                            onChange={(e) => setIntegrationDraft((d) => (d ? { ...d, provider: e.target.value } : d))}
                            className="w-full rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm text-white disabled:opacity-80"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            disabled={!isEditing}
                            value={item.type}
                            onChange={(e) => setIntegrationDraft((d) => (d ? { ...d, type: e.target.value } : d))}
                            className="w-full rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm text-white disabled:opacity-80"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <select
                            disabled={!isEditing}
                            value={item.status}
                            onChange={(e) => setIntegrationDraft((d) => (d ? { ...d, status: e.target.value } : d))}
                            className="rounded bg-slate-900 border border-slate-700 px-2 py-1 text-sm text-white disabled:opacity-80"
                          >
                            <option value="active">active</option>
                            <option value="inactive">inactive</option>
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex justify-end gap-2">
                            {!isEditing ? (
                              <button
                                onClick={() => {
                                  setEditingIntegrationId(integration.id);
                                  setIntegrationDraft({ ...integration });
                                }}
                                className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs"
                              >
                                Edit
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={saveIntegrationEdit}
                                  className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-xs"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingIntegrationId(null);
                                    setIntegrationDraft(null);
                                  }}
                                  className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => removeIntegration(integration.id)}
                              className="px-2 py-1 rounded bg-red-800 hover:bg-red-700 text-white text-xs"
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
