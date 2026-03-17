"use client";

import { endpoints } from "@/services/endpoints";
import React, { useEffect, useState } from "react";

type Webhook = {
  id: string | number;
  event: string;
  url: string;
  enabled: boolean;
};

type WebhookForm = {
  event: string;
  url: string;
  enabled: boolean;
};

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<WebhookForm>({
    event: "",
    url: "",
    enabled: true,
  });

  useEffect(() => {    fetch(endpoints.admin.webhooks, {
      
    })
      .then((res) => res.json())
      .then((data) => {
        setWebhooks(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Erro ao carregar webhooks.");
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);    try {
      await fetch(endpoints.admin.webhooks, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",

        },
        body: JSON.stringify(form),
      });
      setForm({ event: "", url: "", enabled: true });
    } catch {
      setError("Erro ao salvar webhook.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Carregando webhooks...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="max-w-xl mx-auto p-6 bg-white border rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-4">Webhooks</h1>
      <form onSubmit={handleSave} className="space-y-4 mb-8">
        <div>
          <label className="font-semibold">Evento</label>
          <select
            name="event"
            value={form.event}
            onChange={handleChange}
            className="border rounded px-2 py-1 w-full"
            required
          >
            <option value="">Selecione</option>
            <option value="pedido_criado">Pedido criado</option>
            <option value="pagamento_aprovado">Pagamento aprovado</option>
            <option value="cliente_registrado">Cliente registrado</option>
            <option value="produto_atualizado">Produto atualizado</option>
          </select>
        </div>
        <div>
          <label className="font-semibold">URL de destino</label>
          <input
            type="url"
            name="url"
            value={form.url}
            onChange={handleChange}
            className="border rounded px-2 py-1 w-full"
            required
          />
        </div>
        <div>
          <label className="font-semibold">Ativar webhook</label>
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
          {saving ? "Salvando..." : "Salvar webhook"}
        </button>
      </form>
      <h2 className="text-lg font-semibold mb-2">Webhooks cadastrados</h2>
      <ul className="space-y-2">
        {webhooks.length === 0 ? (
          <li className="text-gray-500">Nenhum webhook cadastrado.</li>
        ) : (
          webhooks.map((webhook) => (
            <li
              key={webhook.id}
              className="border rounded p-2 bg-gray-50 flex justify-between items-center"
            >
              <div>
                <div className="font-semibold">{webhook.event}</div>
                <div className="text-xs text-gray-600">URL: {webhook.url}</div>
                <div className="text-xs text-gray-400">
                  {webhook.enabled ? "Ativo" : "Desativado"}
                </div>
              </div>
              {/* ...ações futuras... */}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}


