"use client";
import React, { useEffect, useState } from 'react';
import { endpoints } from '@/services/endpoints';
import { AuthService } from '@/services/auth';

type LogEntry = {
  id: string | number;
  userName?: string;
  userEmail?: string;
  action?: string;
  details?: string;
  date: string;
};

export default function LogsPage() {
  const token = AuthService.getToken();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(() => Boolean(token));
  const [error, setError] = useState<string | null>(() => (token ? null : 'Usuário não autenticado.'));
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch(endpoints.admin.logs, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        setLogs(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Erro ao carregar logs.');
        setLoading(false);
      });
  }, [token]);

  const filteredLogs = logs.filter(log => {
    const matchesUser = userFilter ? (log.userName?.includes(userFilter) || log.userEmail?.includes(userFilter)) : true;
    const matchesAction = actionFilter ? log.action?.includes(actionFilter) : true;
    const matchesDate = dateFilter ? new Date(log.date).toISOString().slice(0, 10) === dateFilter : true;
    const matchesSearch = search ? (log.details?.toLowerCase().includes(search.toLowerCase()) || log.action?.toLowerCase().includes(search.toLowerCase())) : true;
    return matchesUser && matchesAction && matchesDate && matchesSearch;
  });

  if (loading) return <div>Carregando logs...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!filteredLogs.length) return <div>Nenhum log encontrado.</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white border rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-4">Logs Administrativos</h1>
      <div className="flex flex-wrap gap-4 mb-4">
        <input type="text" placeholder="Filtrar por usuário" value={userFilter} onChange={e => setUserFilter(e.target.value)} className="border rounded px-2 py-1" />
        <input type="text" placeholder="Filtrar por ação" value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="border rounded px-2 py-1" />
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="border rounded px-2 py-1" />
        <input type="text" placeholder="Buscar" value={search} onChange={e => setSearch(e.target.value)} className="border rounded px-2 py-1" />
      </div>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Data</th>
            <th className="p-2 border">Usuário</th>
            <th className="p-2 border">Ação</th>
            <th className="p-2 border">Detalhes</th>
          </tr>
        </thead>
        <tbody>
          {filteredLogs.map(log => (
            <tr key={log.id}>
              <td className="p-2 border">{new Date(log.date).toLocaleString()}</td>
              <td className="p-2 border">{log.userName || log.userEmail}</td>
              <td className="p-2 border">{log.action}</td>
              <td className="p-2 border">{log.details}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
