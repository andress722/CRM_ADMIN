"use client";

import { AuthService } from "@/services/auth";
import { endpoints } from "@/services/endpoints";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

export default function NewProductPage() {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
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
      const res = await fetch(endpoints.admin.products, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, price: Number(price) }),
      });
      if (!res.ok) throw new Error("Erro ao criar produto");
      router.push("/products");
    } catch {
      setError("Erro ao criar produto.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-white border rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-4">Novo Produto</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Nome do produto"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border rounded px-2 py-1"
          required
        />
        <input
          type="number"
          placeholder="Preço"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="border rounded px-2 py-1"
          required
        />
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
