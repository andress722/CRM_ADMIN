"use client";
import { endpoints } from "@/services/endpoints";
import ExcelJS from "exceljs";
import React, { useEffect, useState } from "react";

type Integration = {
  id: string;
  type: string;
  apiKey: string;
  enabled: boolean;
};

type IntegrationForm = {
  type: string;
  apiKey: string;
  enabled: boolean;
};

type IntegrationLog = {
  action: string;
  date: string;
  details?: string;
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<IntegrationForm>({
    type: "",
    apiKey: "",
    enabled: false,
  });
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [showLogsId, setShowLogsId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const exportCSV = () => {
    if (!integrations.length) return;
    const header = ["Tipo", "API Key", "Status"];
    const rows = integrations.map((integration) => [
      integration.type,
      integration.apiKey,
      integration.enabled ? "Ativa" : "Desativada",
    ]);
    const csv = [header, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "integracoes.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = async () => {
    if (!integrations.length) return;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Integrações");
    sheet.columns = [
      { header: "Tipo", key: "type", width: 18 },
      { header: "API Key", key: "apiKey", width: 32 },
      { header: "Status", key: "status", width: 16 },
    ];
    integrations.forEach((integration) => {
      sheet.addRow({
        type: integration.type,
        apiKey: integration.apiKey,
        status: integration.enabled ? "Ativa" : "Desativada",
      });
    });
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "integracoes.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  };

  const testConnection = async (id: string) => {
    setTestingId(id);
    setTestResult(null);    try {
      const res = await fetch(`${endpoints.admin.integrations}/${id}/test`, {
        method: "POST",
        
      });
      const data = await res.json();
      setTestResult(
        data.success ? "Conexão bem-sucedida!" : "Falha na conexão.",
      );
    } catch {
      setTestResult("Erro ao testar conexão.");
    } finally {
      setTestingId(null);
    }
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<IntegrationForm>({
    type: "",
    apiKey: "",
    enabled: false,
  });

  useEffect(() => {    fetch(endpoints.admin.integrations, {
      
    })
      .then((res) => res.json())
      .then((data) => {
        setIntegrations(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Erro ao carregar integrações.");
        setLoading(false);
      });
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    const checked = target.checked;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };
  const handleEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    const checked = target.checked;
    setEditForm((f) => ({
      ...f,
      [name]: type === "checkbox" ? checked : value,
    }));
  };
  const startEdit = (integration: Integration) => {
    setEditId(integration.id);
    setEditForm({
      type: integration.type,
      apiKey: integration.apiKey,
      enabled: integration.enabled,
    });
  };

  const saveEdit = async (id: string) => {
    setSaving(true);    try {
      await fetch(`${endpoints.admin.integrations}/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",

        },
        body: JSON.stringify(editForm),
      });
      setIntegrations((list) =>
        list.map((i) => (i.id === id ? { ...i, ...editForm } : i)),
      );
      setEditId(null);
    } catch {
      setError("Erro ao editar integração.");
    } finally {
      setSaving(false);
    }
  };

  const removeIntegration = async (id: string) => {
    setSaving(true);    try {
      await fetch(`${endpoints.admin.integrations}/${id}`, {
        method: "DELETE",
        
      });
      setIntegrations((list) => list.filter((i) => i.id !== id));
    } catch {
      setError("Erro ao remover integração.");
    } finally {
      setSaving(false);
    }
  };

  const fetchLogs = async (id: string) => {    try {
      const res = await fetch(`${endpoints.admin.integrations}/${id}/logs`, {
        
      });
      const data = await res.json();
      setLogs(data);
      setShowLogsId(id);
    } catch {
      setError("Erro ao carregar logs.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);    try {
      await fetch(endpoints.admin.integrations, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",

        },
        body: JSON.stringify(form),
      });
      setForm({ type: "", apiKey: "", enabled: false });
    } catch {
      setError("Erro ao salvar integração.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Carregando integrações...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="max-w-xl mx-auto p-6 bg-white border rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-4">Integrações Externas</h1>
      <form onSubmit={handleSave} className="space-y-4 mb-8">
        <div>
          <label className="font-semibold">Tipo de integração</label>
          <select
            name="type"
            value={form.type}
            onChange={handleChange}
            className="border rounded px-2 py-1 w-full"
            required
          >
            <option value="">Selecione</option>
            <option value="pagamento">Pagamento</option>
            <option value="frete">Frete</option>
            <option value="notificacao">Notificação</option>
            <option value="crm">CRM</option>
          </select>
        </div>
        <div>
          <label className="font-semibold">API Key</label>
          <input
            type="text"
            name="apiKey"
            value={form.apiKey}
            onChange={handleChange}
            className="border rounded px-2 py-1 w-full"
            required
          />
        </div>
        <div>
          <label className="font-semibold">Ativar integração</label>
          <input
            type="checkbox"
            name="enabled"
            checked={form.enabled}
            onChange={handleChange}
            className="ml-2"
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded font-semibold"
          disabled={saving}
        >
          {saving ? "Salvando..." : "Salvar integração"}
        </button>
      </form>
      <h2 className="text-lg font-semibold mb-2">Integrações cadastradas</h2>
      <div className="mb-4 flex gap-2">
        <button
          onClick={exportCSV}
          className="bg-gray-600 text-white px-4 py-1 rounded font-semibold"
        >
          Exportar CSV
        </button>
        <button
          onClick={exportExcel}
          className="bg-gray-800 text-white px-4 py-1 rounded font-semibold"
        >
          Exportar Excel
        </button>
      </div>
      <ul className="space-y-2">
        {integrations.length === 0 ? (
          <li className="text-gray-500">Nenhuma integração cadastrada.</li>
        ) : (
          integrations.map((integration) => (
            <li
              key={integration.id}
              className="border rounded p-2 bg-gray-50 flex justify-between items-center"
            >
              <div>
                {editId === integration.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      saveEdit(integration.id);
                    }}
                    className="flex gap-2 items-center"
                  >
                    <select
                      name="type"
                      value={editForm.type}
                      onChange={handleEditChange}
                      className="border rounded px-2 py-1"
                    >
                      <option value="pagamento">Pagamento</option>
                      <option value="frete">Frete</option>
                      <option value="notificacao">Notificação</option>
                      <option value="crm">CRM</option>
                    </select>
                    <input
                      type="text"
                      name="apiKey"
                      value={editForm.apiKey}
                      onChange={handleEditChange}
                      className="border rounded px-2 py-1"
                    />
                    <label className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        name="enabled"
                        checked={editForm.enabled}
                        onChange={handleEditChange}
                      />{" "}
                      Ativa
                    </label>
                    <button
                      type="submit"
                      className="bg-green-600 text-white px-2 py-1 rounded"
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      className="bg-gray-400 text-white px-2 py-1 rounded"
                      onClick={() => setEditId(null)}
                    >
                      Cancelar
                    </button>
                  </form>
                ) : (
                  <>
                    <div className="font-semibold">{integration.type}</div>
                    <div className="text-xs text-gray-600">
                      API Key: {integration.apiKey}
                    </div>
                    <div className="text-xs text-gray-400">
                      {integration.enabled ? "Ativa" : "Desativada"}
                    </div>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                {editId !== integration.id && (
                  <button
                    className="bg-blue-600 text-white px-2 py-1 rounded text-xs"
                    onClick={() => startEdit(integration)}
                  >
                    Editar
                  </button>
                )}
                <button
                  className="bg-red-600 text-white px-2 py-1 rounded text-xs"
                  onClick={() => removeIntegration(integration.id)}
                >
                  Remover
                </button>
                <button
                  className="bg-gray-600 text-white px-2 py-1 rounded text-xs"
                  onClick={() => fetchLogs(integration.id)}
                >
                  Logs
                </button>
                <button
                  className="bg-green-600 text-white px-2 py-1 rounded text-xs"
                  onClick={() => testConnection(integration.id)}
                  disabled={testingId === integration.id}
                >
                  Testar conexão
                </button>
                {testingId === integration.id && (
                  <span className="text-xs text-blue-600 ml-2">
                    Testando...
                  </span>
                )}
                {testResult &&
                  showLogsId !== integration.id &&
                  testingId === null && (
                    <span className="text-xs text-gray-700 ml-2">
                      {testResult}
                    </span>
                  )}
              </div>
            </li>
          ))
        )}
      </ul>
      {showLogsId && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-2">Logs da integração</h2>
          <button
            className="mb-2 text-blue-600 underline text-xs"
            onClick={() => setShowLogsId(null)}
          >
            Fechar
          </button>
          {logs.length === 0 ? (
            <div className="text-gray-500">Nenhum log recente.</div>
          ) : (
            <ul className="space-y-2">
              {logs.map((log, idx) => (
                <li key={idx} className="border rounded p-2 bg-gray-100">
                  <div className="text-sm text-gray-700">{log.action}</div>
                  <div className="text-xs text-gray-400">
                    {new Date(log.date).toLocaleString()}
                  </div>
                  {log.details && (
                    <div className="text-xs text-gray-600 mt-1">
                      {log.details}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}


