"use client";
import { AuthService } from "@/services/auth";
import { endpoints } from "@/services/endpoints";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type CustomerSummary = {
  id: string;
  name: string;
  email: string;
  blocked?: boolean;
};

export default function CustomersPage() {
  const token = AuthService.getToken();
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(() => Boolean(token));
  const [error, setError] = useState<string | null>(() =>
    token ? null : "Usuario nao autenticado.",
  );

  const loadCustomers = useCallback(() => {
    if (!token) return;

    setLoading(true);
    fetch(endpoints.admin.customers, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("failed");
        }
        const data = await res.json();
        setCustomers(Array.isArray(data) ? data : data?.data ?? []);
        setError(null);
      })
      .catch(() => {
        setError("Erro ao carregar clientes.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const toggleBlock = async (customer: CustomerSummary) => {
    if (!token) return;

    try {
      const nextBlocked = !Boolean(customer.blocked);
      const res = await fetch(endpoints.admin.customerDetail(customer.id), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: customer.name,
          email: customer.email,
          blocked: nextBlocked,
        }),
      });

      if (!res.ok) {
        throw new Error("failed");
      }

      setCustomers((prev) =>
        prev.map((item) =>
          item.id === customer.id ? { ...item, blocked: nextBlocked } : item,
        ),
      );
    } catch {
      alert("Falha ao atualizar bloqueio do cliente.");
    }
  };

  if (loading) return <div>Carregando clientes...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!customers.length) return <div>Nenhum cliente encontrado.</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white border rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-4">Clientes</h1>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">ID</th>
            <th className="p-2 border">Nome</th>
            <th className="p-2 border">Email</th>
            <th className="p-2 border">Acoes</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id}>
              <td className="p-2 border">{customer.id}</td>
              <td className="p-2 border">{customer.name}</td>
              <td className="p-2 border">{customer.email}</td>
              <td className="p-2 border">
                <Link
                  href={`/customers/${customer.id}`}
                  className="text-blue-600 underline mr-2"
                >
                  Editar
                </Link>
                <button
                  className="text-red-600 underline"
                  onClick={() => toggleBlock(customer)}
                >
                  {customer.blocked ? "Desbloquear" : "Bloquear"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
