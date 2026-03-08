// Painel de SEO e busca
import { useEffect, useState } from "react";
import { ADMIN_API_URL } from "../src/services/endpoints";

interface SearchReport {
  term: string;
  hits: number;
  conversions: number;
  updatedAt: string;
}

export default function SeoSearchPanel() {
  const [searchReports, setSearchReports] = useState<SearchReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${ADMIN_API_URL}/admin/seo-search`)
      .then((res) => res.json())
      .then((data) => {
        setSearchReports(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">SEO e Busca</h2>
      {loading ? (
        <div>Carregando relatorios...</div>
      ) : (
        <div className="mb-8">
          <h3 className="font-semibold mb-2">Termos de Busca</h3>
          <table className="w-full border mb-4">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2">Termo</th>
                <th className="p-2">Hits</th>
                <th className="p-2">Conversoes</th>
                <th className="p-2">Atualizado</th>
              </tr>
            </thead>
            <tbody>
              {searchReports.map((r, idx) => (
                <tr key={`${r.term}-${idx}`} className="border-b">
                  <td className="p-2">{r.term}</td>
                  <td className="p-2">{r.hits}</td>
                  <td className="p-2">{r.conversions}</td>
                  <td className="p-2">{r.updatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

