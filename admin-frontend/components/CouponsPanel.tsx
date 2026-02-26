// Painel de cupons e promoções avançadas
import { useEffect, useState } from "react";
import { LEGACY_API_URL } from "../lib/legacy-api";

interface Coupon {
  id: string;
  code: string;
  description: string;
  discount: number;
  type: string; // Percentual, Fixo
  active: boolean;
  usageCount: number;
  minValue?: number;
  maxUsage?: number;
  createdAt: string;
}

export default function CouponsPanel() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${LEGACY_API_URL}/coupons`)
      .then((res) => res.json())
      .then((data) => {
        setCoupons(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function toggleCoupon(id: string) {
    // Simula ativação/desativação
    setCoupons((coupons) =>
      coupons.map((c) => (c.id === id ? { ...c, active: !c.active } : c)),
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Cupons e Promoções</h2>
      {loading ? (
        <div>Carregando cupons...</div>
      ) : (
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">Código</th>
              <th className="p-2">Descrição</th>
              <th className="p-2">Desconto</th>
              <th className="p-2">Tipo</th>
              <th className="p-2">Ativo</th>
              <th className="p-2">Usos</th>
              <th className="p-2">Criado em</th>
              <th className="p-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-b">
                <td className="p-2">{c.code}</td>
                <td className="p-2">{c.description}</td>
                <td className="p-2">
                  {c.type === "Percentual"
                    ? `${c.discount}%`
                    : `R$ ${c.discount.toFixed(2)}`}
                </td>
                <td className="p-2">{c.type}</td>
                <td className="p-2">{c.active ? "Sim" : "Não"}</td>
                <td className="p-2">{c.usageCount}</td>
                <td className="p-2">{c.createdAt}</td>
                <td className="p-2">
                  <button
                    className="bg-blue-600 text-white px-2 py-1 rounded"
                    onClick={() => toggleCoupon(c.id)}
                  >
                    {c.active ? "Desativar" : "Ativar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
