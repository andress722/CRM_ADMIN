'use client';

import React, { useState } from 'react';
import { User } from '@/lib/types';
import { Mail, CheckCircle, Search, ShieldAlert } from 'lucide-react';

interface UsersTableProps {
  users: User[];
}

type UserWithRole = User & {
  role?: string;
};

export function UsersTable({ users }: UsersTableProps) {
  const [filter, setFilter] = useState('');

  const filteredUsers = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(filter.toLowerCase()) ||
      u.email.toLowerCase().includes(filter.toLowerCase())
  );

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRoleColor = (role?: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'from-purple-500 to-purple-600';
      case 'manager':
        return 'from-blue-500 to-blue-600';
      case 'customer':
        return 'from-emerald-500 to-emerald-600';
      default:
        return 'from-slate-500 to-slate-600';
    }
  };

  const getRoleIcon = (role?: string) => {
    if (role?.toLowerCase() === 'admin') return '👑';
    if (role?.toLowerCase() === 'manager') return '⚙️';
    return '👤';
  };

  const getUserRole = (user: User): string | undefined => {
    if ('role' in user) {
      return (user as UserWithRole).role;
    }
    return undefined;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-4xl font-bold gradient-text mb-2">Usuários</h2>
          <p className="text-slate-400">Gerenciar membros da plataforma</p>
        </div>
        <div className="px-6 py-3 bg-gradient-to-r from-slate-700 to-slate-800 rounded-xl border border-slate-600">
          <p className="text-2xl font-bold text-emerald-400">{users.length}</p>
          <p className="text-sm text-slate-400">Total de usuários</p>
        </div>
      </div>

      <div className="glass rounded-2xl p-6 border border-slate-600">
        <div className="flex items-center space-x-3 bg-slate-700/30 px-4 py-3 rounded-xl border border-slate-600">
          <Search size={20} className="text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1 bg-transparent outline-none text-slate-200 placeholder-slate-500"
          />
        </div>
      </div>

      <div className="glass rounded-2xl border border-slate-600 overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-400 text-lg">Nenhum usuário encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-600 bg-slate-700/20">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Nome</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Função</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                    Verificação
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                    Data de Cadastro
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-600">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-700/20 transition-colors group">
                    <td className="px-6 py-4 text-sm font-medium text-slate-200 group-hover:text-white">
                      {user.fullName}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400 flex items-center space-x-2">
                      <Mail size={16} className="text-slate-500" />
                      <span>{user.email}</span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${getRoleColor(
                          getUserRole(user)
                        )} inline-flex items-center space-x-1`}
                      >
                        <span>{getRoleIcon(getUserRole(user))}</span>
                        <span>{getUserRole(user) || 'Cliente'}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {user.isEmailVerified ? (
                        <div className="flex items-center space-x-2 text-emerald-400">
                          <CheckCircle size={18} />
                          <span>Verificado</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 text-yellow-400">
                          <ShieldAlert size={18} />
                          <span>Pendente</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400 text-xs">
                      {formatDate(user.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
