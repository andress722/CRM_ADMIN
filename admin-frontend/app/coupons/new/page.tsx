"use client";
import { AuthService } from "@/services/auth";
import { endpoints } from "@/services/endpoints";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

export default function NewCouponPage() {
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState("");
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const token = AuthService.getToken();
    if (!token) {
      setError("Usuário não autenticado.");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(endpoints.admin.coupons, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code, discount: Number(discount), active }),
      });
      if (!res.ok) throw new Error("Erro ao criar cupom");
      router.push("/coupons");
    } catch {
      setError("Erro ao criar cupom.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-white border rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-4">Novo Cupom</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Código do cupom"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="border rounded px-2 py-1"
          required
        />
        <input
          type="number"
          placeholder="Desconto (%)"
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
          className="border rounded px-2 py-1"
          required
        />
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          Ativo
        </label>
        {error && <div className="text-red-600">{error}</div>}
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded font-bold"
          disabled={loading}
        >
          {loading ? "Salvando..." : "Salvar"}
        </button>
      </form>
    </div>
  );
}
