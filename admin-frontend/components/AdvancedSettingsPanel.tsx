// Painel de configuracoes avancadas
import { useEffect, useState } from "react";
import { ADMIN_API_URL } from "../lib/legacy-api";

interface BusinessParams {
  minOrderValue: number;
  maxInstallments: number;
  emailSender: string;
}

interface Integration {
  id: string;
  name: string;
  type: string;
  status: string;
}

const TEMPLATE_STORAGE_KEY = "admin_email_template_v1";
const DEFAULT_TEMPLATE = "Assunto: Resumo da sua compra\n\nOla, {{nome}}!\nSeu pedido {{pedido}} foi atualizado.";

export default function AdvancedSettingsPanel() {
  const [params, setParams] = useState<BusinessParams | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailTemplate, setEmailTemplate] = useState(DEFAULT_TEMPLATE);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const saved = window.localStorage.getItem(TEMPLATE_STORAGE_KEY);
        if (saved) {
          setEmailTemplate(saved);
        }
      }
    } catch {
      // noop
    }

    Promise.all([
      fetch(`${ADMIN_API_URL}/admin/settings`).then((res) =>
        res.ok ? res.json() : Promise.resolve(null),
      ),
      fetch(`${ADMIN_API_URL}/admin/integrations`).then((res) =>
        res.ok ? res.json() : Promise.resolve([]),
      ),
    ])
      .then(([settingsData, integrationsData]) => {
        setParams({
          minOrderValue: 0,
          maxInstallments: 1,
          emailSender: settingsData?.contactEmail || "contato@ecommerce.com",
        });
        setIntegrations(Array.isArray(integrationsData) ? integrationsData : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function saveEmailTemplate() {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(TEMPLATE_STORAGE_KEY, emailTemplate);
      }
      setSaveMessage("Template salvo no navegador.");
    } catch {
      setSaveMessage("Nao foi possivel salvar o template.");
    }
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Configuracoes Avancadas</h2>
      {loading ? (
        <div>Carregando configuracoes...</div>
      ) : (
        <>
          <div className="mb-8">
            <h3 className="font-semibold mb-2">Parametros de Negocio</h3>
            <ul className="mb-4">
              <li>Valor minimo do pedido: R$ {params?.minOrderValue.toFixed(2)}</li>
              <li>Maximo de parcelas: {params?.maxInstallments}</li>
              <li>Remetente de e-mails: {params?.emailSender}</li>
            </ul>
          </div>
          <div className="mb-8">
            <h3 className="font-semibold mb-2">Integracoes Externas</h3>
            <table className="min-w-full border text-xs sm:text-sm mb-4">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2">Nome</th>
                  <th className="p-2">Tipo</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {integrations.map((i) => (
                  <tr key={i.id} className="border-b">
                    <td className="p-2">{i.name}</td>
                    <td className="p-2">{i.type}</td>
                    <td className="p-2">{i.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Personalizacao de E-mails</h3>
            <textarea
              value={emailTemplate}
              onChange={(e) => setEmailTemplate(e.target.value)}
              rows={8}
              className="w-full border rounded mb-2 px-2 py-1"
            />
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded font-bold"
              onClick={saveEmailTemplate}
            >
              Salvar Template
            </button>
            {saveMessage && <div className="mt-2 text-sm text-gray-700">{saveMessage}</div>}
          </div>
        </>
      )}
    </div>
  );
}
