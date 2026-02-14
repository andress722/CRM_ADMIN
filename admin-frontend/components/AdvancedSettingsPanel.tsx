// Painel de configurações avançadas
import React, { useEffect, useState } from 'react';

interface BusinessParams {
  minOrderValue: number;
  maxInstallments: number;
  emailSender: string;
}

interface Integration {
  id: string;
  name: string;
  type: string; // ERP, Fiscal, Transportadora, Gateway
  status: string;
}

export default function AdvancedSettingsPanel() {
  const [params, setParams] = useState<BusinessParams | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailTemplate, setEmailTemplate] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('http://localhost:5000/api/business-params').then(res => res.json()),
      fetch('http://localhost:5000/api/integrations').then(res => res.json()),
      fetch('http://localhost:5000/api/email-template').then(res => res.text())
    ]).then(([paramsData, integrationsData, emailData]) => {
      setParams(paramsData);
      setIntegrations(integrationsData);
      setEmailTemplate(emailData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  function saveEmailTemplate() {
    // Simula salvar template
    alert('Template de e-mail salvo!');
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Configurações Avançadas</h2>
      {loading ? (
        <div>Carregando configurações...</div>
      ) : (
        <>
          <div className="mb-8">
            <h3 className="font-semibold mb-2">Parâmetros de Negócio</h3>
            <ul className="mb-4">
              <li>Valor mínimo do pedido: R$ {params?.minOrderValue.toFixed(2)}</li>
              <li>Máximo de parcelas: {params?.maxInstallments}</li>
              <li>Remetente de e-mails: {params?.emailSender}</li>
            </ul>
          </div>
          <div className="mb-8">
            <h3 className="font-semibold mb-2">Integrações Externas</h3>
            <table className="min-w-full border text-xs sm:text-sm mb-4">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2">Nome</th>
                  <th className="p-2">Tipo</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {integrations.map(i => (
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
            <h3 className="font-semibold mb-2">Personalização de E-mails</h3>
            <textarea value={emailTemplate} onChange={e => setEmailTemplate(e.target.value)} rows={8} className="w-full border rounded mb-2 px-2 py-1" />
            <button className="bg-blue-600 text-white px-4 py-2 rounded font-bold" onClick={saveEmailTemplate}>Salvar Template</button>
          </div>
        </>
      )}
    </div>
  );
}
