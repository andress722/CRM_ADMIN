// Painel de SEO e busca
import React, { useEffect, useState } from 'react';
import { API_URL } from '@/services/endpoints';
import { fetchJson } from '@/services/fetch-client';

interface SearchReport {
  id: string;
  query: string;
  resultsCount: number;
  timestamp: string;
}

interface SeoReport {
  id: string;
  page: string;
  score: number;
  issues: string[];
  lastChecked: string;
}

export default function SeoSearchPanel() {
  const [searchReports, setSearchReports] = useState<SearchReport[]>([]);
  const [seoReports, setSeoReports] = useState<SeoReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [searchData, seoData] = await Promise.all([
          fetchJson<SearchReport[]>(`${API_URL}/search-reports`),
          fetchJson<SeoReport[]>(`${API_URL}/seo-reports`),
        ]);
        if (!mounted) return;
        setSearchReports(searchData);
        setSeoReports(seoData);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">SEO & Busca</h2>
      {loading ? (
        <div>Carregando relatórios...</div>
      ) : (
        <>
          <div className="mb-8">
            <h3 className="font-semibold mb-2">Relatórios de Busca</h3>
            <table className="w-full border mb-4">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2">Consulta</th>
                  <th className="p-2">Resultados</th>
                  <th className="p-2">Data</th>
                </tr>
              </thead>
              <tbody>
                {searchReports.map(r => (
                  <tr key={r.id} className="border-b">
                    <td className="p-2">{r.query}</td>
                    <td className="p-2">{r.resultsCount}</td>
                    <td className="p-2">{r.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Relatórios de SEO</h3>
            <table className="w-full border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2">Página</th>
                  <th className="p-2">Score</th>
                  <th className="p-2">Problemas</th>
                  <th className="p-2">Última verificação</th>
                </tr>
              </thead>
              <tbody>
                {seoReports.map(r => (
                  <tr key={r.id} className="border-b">
                    <td className="p-2">{r.page}</td>
                    <td className="p-2">{r.score}</td>
                    <td className="p-2">{r.issues.join(', ')}</td>
                    <td className="p-2">{r.lastChecked}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
