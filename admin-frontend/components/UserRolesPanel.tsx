// Painel de permissões, papéis e auditoria
import React, { useEffect, useState } from 'react';
import { API_URL } from '@/services/endpoints';

interface User {
  id: string;
  name: string;
  email: string;
  role: string; // admin, operador, financeiro
  lastLogin: string;
}

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  timestamp: string;
}

export default function UserRolesPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/users`).then(res => res.json()),
      fetch(`${API_URL}/audit-logs`).then(res => res.json())
    ]).then(([userData, logData]) => {
      setUsers(userData);
      setLogs(logData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  function changeRole(id: string, role: string) {
    // Simula alteração de papel
    setUsers(users => users.map(u => u.id === id ? { ...u, role } : u));
  }

  const filteredUsers = users.filter(u => !roleFilter || u.role === roleFilter);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Permissões, Papéis e Auditoria</h2>
      <div className="mb-4">
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="border rounded px-2 py-1">
          <option value="">Todos</option>
          <option value="admin">Admin</option>
          <option value="operador">Operador</option>
          <option value="financeiro">Financeiro</option>
        </select>
      </div>
      <h3 className="font-semibold mb-2">Usuários</h3>
      {loading ? (
        <div>Carregando usuários...</div>
      ) : (
        <table className="min-w-full border text-xs sm:text-sm mb-8">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">Nome</th>
              <th className="p-2">E-mail</th>
              <th className="p-2">Papel</th>
              <th className="p-2">Último login</th>
              <th className="p-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(u => (
              <tr key={u.id} className="border-b">
                <td className="p-2">{u.name}</td>
                <td className="p-2">{u.email}</td>
                <td className="p-2">{u.role}</td>
                <td className="p-2">{u.lastLogin}</td>
                <td className="p-2">
                  <select value={u.role} onChange={e => changeRole(u.id, e.target.value)} className="border rounded px-2 py-1">
                    <option value="admin">Admin</option>
                    <option value="operador">Operador</option>
                    <option value="financeiro">Financeiro</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <h3 className="font-semibold mb-2">Logs de Auditoria</h3>
      {loading ? (
        <div>Carregando logs...</div>
      ) : (
        <table className="min-w-full border text-xs sm:text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">Usuário</th>
              <th className="p-2">Ação</th>
              <th className="p-2">Data</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(l => (
              <tr key={l.id} className="border-b">
                <td className="p-2">{users.find(u => u.id === l.userId)?.name || '-'}</td>
                <td className="p-2">{l.action}</td>
                <td className="p-2">{l.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
