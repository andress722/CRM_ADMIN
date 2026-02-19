"use client";

import React, { useState, useEffect } from 'react';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/AsyncState';
import { endpoints } from '@/services/endpoints';
import { AuthService } from '@/services/auth';
import { authFetch } from '@/services/auth-fetch';
import Link from 'next/link';

type CustomerSummary = {
  id: string;
  name: string;
  email: string;
};

export default function CustomersPage() {
  const token = AuthService.getToken();
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(() => Boolean(token));
  const [error, setError] = useState<string | null>(() => (token ? null : 'Usuário não autenticado.'));

  useEffect(() => {
    if (!token) return;
    authFetch(endpoints.admin.customers, {
      headers: {},
    })
      .then(res => res.json())
      .then(data => {
        setCustomers(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Erro ao carregar clientes.');
        setLoading(false);
      });
  }, [token]);

  if (loading) return <LoadingState message="Carregando clientes..." />;
  if (error) return <ErrorState message={error} />;
  if (!customers.length) return <EmptyState message="Nenhum cliente encontrado." />;

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white border rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-4">Clientes</h1>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">ID</th>
            <th className="p-2 border">Nome</th>
            <th className="p-2 border">Email</th>
            <th className="p-2 border">Ações</th>
          </tr>
        </thead>
        <tbody>
          {customers.map(customer => (
            <tr key={customer.id}>
              <td className="p-2 border">{customer.id}</td>
              <td className="p-2 border">{customer.name}</td>
              <td className="p-2 border">{customer.email}</td>
              <td className="p-2 border">
                <Link href={`/customers/${customer.id}`} className="text-blue-600 underline mr-2">Editar</Link>
                <button className="text-red-600 underline" onClick={() => alert('Bloquear/desbloquear em breve')}>Bloquear</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}









