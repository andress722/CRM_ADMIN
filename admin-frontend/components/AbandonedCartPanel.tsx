// Painel de carrinho abandonado
import { useEffect, useState } from "react";
import { ADMIN_API_URL } from "../lib/legacy-api";

interface AbandonedCart {
  id: string;
  customerName: string;
  email: string;
  items: { productId: string; name: string; quantity: number }[];
  lastUpdated: string;
  recoveryStatus: string;
}

export default function AbandonedCartPanel() {
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${ADMIN_API_URL}/admin/abandoned-carts`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`http_${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setCarts(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Nao foi possivel carregar carrinhos abandonados.");
        setLoading(false);
      });
  }, []);

  const filtered = carts.filter(
    (c) => !statusFilter || c.recoveryStatus === statusFilter,
  );

  async function sendRecoveryEmail(cart: AbandonedCart) {
    try {
      const res = await fetch(
        `${ADMIN_API_URL}/admin/abandoned-carts/${cart.id}/recover`,
        { method: "POST" },
      );

      if (!res.ok) {
        throw new Error(`http_${res.status}`);
      }

      setCarts((current) =>
        current.map((c) =>
          c.id === cart.id ? { ...c, recoveryStatus: "Recuperado" } : c,
        ),
      );
    } catch {
      setError("Nao foi possivel enviar recuperacao para este carrinho.");
    }
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Carrinhos Abandonados</h2>
      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded px-2 py-1"
        >
          <option value="">Status</option>
          <option value="Pendente">Pendente</option>
          <option value="Recuperado">Recuperado</option>
        </select>
      </div>
      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
      {loading ? (
        <div>Carregando carrinhos...</div>
      ) : (
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">Cliente</th>
              <th className="p-2">E-mail</th>
              <th className="p-2">Itens</th>
              <th className="p-2">Ultima atualizacao</th>
              <th className="p-2">Status</th>
              <th className="p-2">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b">
                <td className="p-2">{c.customerName}</td>
                <td className="p-2">{c.email}</td>
                <td className="p-2">
                  {c.items.map((i) => `${i.name} x${i.quantity}`).join(", ")}
                </td>
                <td className="p-2">{c.lastUpdated}</td>
                <td className="p-2">{c.recoveryStatus}</td>
                <td className="p-2">
                  <button
                    className="bg-green-600 text-white px-2 py-1 rounded disabled:bg-gray-300"
                    disabled={c.recoveryStatus === "Recuperado"}
                    onClick={() => sendRecoveryEmail(c)}
                  >
                    Enviar recuperacao
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

