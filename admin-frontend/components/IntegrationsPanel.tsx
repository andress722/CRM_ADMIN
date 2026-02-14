// Painel de Integrações: ERP, fiscal, transportadoras, gateways extras
import React, { useState, useEffect } from 'react';
import { ApiClient } from '../src/services/api-client';

interface Integration {
  id: string;
  name: string;
  type: 'ERP' | 'Fiscal' | 'Transportadora' | 'Gateway';
  status: 'ativo' | 'inativo' | 'erro';
  configUrl?: string;
}

export default function IntegrationsPanel() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const data = await ApiClient.get<Integration[]>('/admin/integrations');
        if (mounted) setIntegrations(data || []);
      } catch (err) {
        console.error('Failed to load integrations', err);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Integrações com Outros Sistemas</h2>
      <table className="min-w-full border text-xs sm:text-sm mb-4">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2">Nome</th>
            <th className="p-2">Tipo</th>
            <th className="p-2">Status</th>
            <th className="p-2">Configuração</th>
          </tr>
        </thead>
        <tbody>
          {integrations.map(i => (
            <tr key={i.id} className="border-b">
              <td className="p-2 font-semibold">{i.name}</td>
              <td className="p-2">{i.type}</td>
              <td className={`p-2 font-bold ${i.status === 'ativo' ? 'text-emerald-600' : i.status === 'erro' ? 'text-red-600' : 'text-gray-400'}`}>{i.status}</td>
              <td className="p-2">
                {i.configUrl ? (
                  <a href={i.configUrl} className="text-blue-600 underline">Configurar</a>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 text-xs text-gray-500">
        Para novas integrações, consulte o suporte técnico ou acesse a documentação.
      </div>
    </div>
  );
}
