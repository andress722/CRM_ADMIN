// Painel de reviews e recomendações
import { useEffect, useState } from "react";
import { LEGACY_API_URL } from "../lib/legacy-api";

interface Review {
  id: string;
  productId: string;
  productName: string;
  customerName: string;
  rating: number;
  comment: string;
  status: string; // Aprovado, Pendente, Recusado
  createdAt: string;
}

export default function ReviewsPanel() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    fetch(`${LEGACY_API_URL}/reviews`)
      .then((res) => res.json())
      .then((data) => {
        setReviews(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = reviews.filter(
    (r) => !statusFilter || r.status === statusFilter,
  );

  function moderateReview(id: string, status: string) {
    // Simula moderação
    setReviews((reviews) =>
      reviews.map((r) => (r.id === id ? { ...r, status } : r)),
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Reviews e Recomendações</h2>
      <div className="mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded px-2 py-1"
        >
          <option value="">Status</option>
          <option value="Aprovado">Aprovado</option>
          <option value="Pendente">Pendente</option>
          <option value="Recusado">Recusado</option>
        </select>
      </div>
      {loading ? (
        <div>Carregando reviews...</div>
      ) : (
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">Produto</th>
              <th className="p-2">Cliente</th>
              <th className="p-2">Nota</th>
              <th className="p-2">Comentário</th>
              <th className="p-2">Status</th>
              <th className="p-2">Data</th>
              <th className="p-2">Ações</th>
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
                    onClick={() => moderateReview(r.id, "Aprovado")}
                  >
                    Aprovar
                  </button>
                  <button
                    className="bg-red-600 text-white px-2 py-1 rounded"
                    onClick={() => moderateReview(r.id, "Recusado")}
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
