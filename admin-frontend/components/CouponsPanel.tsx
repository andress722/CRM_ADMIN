// Painel de cupons e promocoes avancadas
import { useEffect, useState } from "react";
import ApiClient from "../src/services/api-client";
import { endpoints } from "../src/services/endpoints";

interface Coupon {
  id: string;
  code: string;
  discount: number;
  active: boolean;
}

export default function CouponsPanel() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ApiClient.get<Coupon[]>(endpoints.admin.coupons)
      .then((data) => {
        setCoupons(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setError("Nao foi possivel carregar cupons.");
        setLoading(false);
      });
  }, []);

  async function toggleCoupon(id: string) {
    const coupon = coupons.find((c) => c.id === id);
    if (!coupon) return;

    const nextActive = !coupon.active;
    try {
      await ApiClient.put(endpoints.admin.couponDetail(id), {
        id: coupon.id,
        code: coupon.code,
        discount: coupon.discount,
        active: nextActive,
      });

      setCoupons((current) =>
        current.map((c) => (c.id === id ? { ...c, active: nextActive } : c)),
      );
    } catch {
      setError("Nao foi possivel atualizar o cupom.");
    }
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Cupons e Promocoes</h2>
      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
      {loading ? (
        <div>Carregando cupons...</div>
      ) : (
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">Codigo</th>
              <th className="p-2">Desconto</th>
              <th className="p-2">Ativo</th>
              <th className="p-2">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="border-b">
                <td className="p-2">{c.code}</td>
                <td className="p-2">{c.discount}%</td>
                <td className="p-2">{c.active ? "Sim" : "Nao"}</td>
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
