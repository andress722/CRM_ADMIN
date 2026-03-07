// Painel de cupons e promocoes avancadas
import { useEffect, useState } from "react";
import { LEGACY_API_URL } from "../lib/legacy-api";

interface Coupon {
  id: string;
  code: string;
  discount: number;
  active: boolean;
}

export default function CouponsPanel() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${LEGACY_API_URL}/admin/promotions/coupons`)
      .then((res) => res.json())
      .then((data) => {
        setCoupons(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function toggleCoupon(id: string) {
    setCoupons((current) =>
      current.map((c) => (c.id === id ? { ...c, active: !c.active } : c)),
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Cupons e Promocoes</h2>
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
