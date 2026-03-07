// Painel de reviews e recomendacoes
import { useEffect, useState } from "react";
import { LEGACY_API_URL } from "../lib/legacy-api";

interface Review {
  id: string;
  productId: string;
  productName: string;
  customerName: string;
  rating: number;
  comment: string;
  status: string;
  createdAt: string;
}

export default function ReviewsPanel() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${LEGACY_API_URL}/admin/reviews`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`http_${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setReviews(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Nao foi possivel carregar reviews.");
        setLoading(false);
      });
  }, []);

  const filtered = reviews.filter(
    (r) => !statusFilter || r.status.toLowerCase() === statusFilter.toLowerCase(),
  );

  async function moderateReview(id: string, status: "Approved" | "Rejected") {
    try {
      const res = await fetch(`${LEGACY_API_URL}/reviews/${id}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        throw new Error(`http_${res.status}`);
      }

      setReviews((current) =>
        current.map((r) => (r.id === id ? { ...r, status } : r)),
      );
    } catch {
      setError("Nao foi possivel moderar este review.");
    }
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Reviews e Recomendacoes</h2>
      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded px-2 py-1"
        >
          <option value="">Status</option>
          <option value="Approved">Aprovado</option>
          <option value="Pending">Pendente</option>
          <option value="Rejected">Recusado</option>
        </select>
      </div>
      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
      {loading ? (
        <div>Carregando reviews...</div>
      ) : (
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">Produto</th>
              <th className="p-2">Cliente</th>
              <th className="p-2">Nota</th>
              <th className="p-2">Comentario</th>
              <th className="p-2">Status</th>
              <th className="p-2">Data</th>
              <th className="p-2">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="p-2">{r.productName}</td>
                <td className="p-2">{r.customerName}</td>
                <td className="p-2">{r.rating}</td>
                <td className="p-2">{r.comment}</td>
                <td className="p-2">{r.status}</td>
                <td className="p-2">{r.createdAt}</td>
                <td className="p-2">
                  <button
                    className="bg-green-600 text-white px-2 py-1 rounded mr-2"
                    onClick={() => moderateReview(r.id, "Approved")}
                  >
                    Aprovar
                  </button>
                  <button
                    className="bg-red-600 text-white px-2 py-1 rounded"
                    onClick={() => moderateReview(r.id, "Rejected")}
                  >
                    Recusar
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
