// Painel de logs estruturados
import React, { useEffect, useState } from 'react';
import { LEGACY_API_URL } from '@/services/endpoints';
import { fetchJson } from '@/services/fetch-client';

interface Log {
  id: string;
  type: string; // erro, acesso, evento
  message: string;
  user?: string;
  timestamp: string;
}

export default function LogsPanel() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const data = await fetchJson<Log[]>(`${LEGACY_API_URL}/logs`);
        if (!mounted) return;
        setLogs(data);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = logs.filter(l => !typeFilter || l.type === typeFilter);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Logs Estruturados</h2>
      <div className="mb-4">
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border rounded px-2 py-1">
          <option value="">Todos</option>
          <option value="erro">Erro</option>
          <option value="acesso">Acesso</option>
          <option value="evento">Evento</option>
        </select>
      </div>
      {loading ? (
        <div>Carregando logs...</div>
      ) : (
        <table className="min-w-full border text-xs sm:text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">Tipo</th>
              <th className="p-2">Mensagem</th>
              <th className="p-2">Usuário</th>
              <th className="p-2">Data</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(l => (
              <tr key={l.id} className="border-b">
                <td className="p-2">{l.type}</td>
                <td className="p-2">{l.message}</td>
                <td className="p-2">{l.user || '-'}</td>
                <td className="p-2">{l.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}


