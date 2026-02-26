"use client";
import { AuthService } from "@/services/auth";
import { endpoints } from "@/services/endpoints";
import Link from "next/link";
import { useEffect, useState } from "react";

type Coupon = {
  id: string;
  code: string;
  discount: number;
  active: boolean;
};

export default function CouponsPage() {
  const token = AuthService.getToken();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(() => Boolean(token));
  const [error, setError] = useState<string | null>(() =>
    token ? null : "Usuário não autenticado.",
  );

  useEffect(() => {
    if (!token) return;
    fetch(endpoints.admin.coupons, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setCoupons(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Erro ao carregar cupons.");
        setLoading(false);
      });
  }, [token]);

  if (loading) return <div>Carregando cupons...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!coupons.length) return <div>Nenhum cupom encontrado.</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white border rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-4">Cupons</h1>
      <Link
        href="/coupons/new"
        className="bg-blue-600 text-white px-4 py-2 rounded font-bold mb-4 inline-block"
      >
        Novo Cupom
      </Link>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Código</th>
            <th className="p-2 border">Desconto</th>
            <th className="p-2 border">Ativo</th>
            <th className="p-2 border">Ações</th>
          </tr>
        </thead>
        <tbody>
          {coupons.map((coupon) => (
            <tr key={coupon.id}>
              <td className="p-2 border">{coupon.code}</td>
              <td className="p-2 border">{coupon.discount}%</td>
              <td className="p-2 border">{coupon.active ? "Sim" : "Não"}</td>
              <td className="p-2 border">
                <Link
                  href={`/coupons/${coupon.id}`}
                  className="text-blue-600 underline mr-2"
                >
                  Editar
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
