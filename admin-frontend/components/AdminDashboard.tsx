// Dashboard geral do admin: KPIs, gráficos, atalhos
import { useEffect, useState } from "react";
import { LEGACY_API_URL } from "../lib/legacy-api";

interface Kpi {
  label: string;
  value: string | number;
  icon?: string;
  link?: string;
}

interface ChartData {
  label: string;
  data: number[];
  categories: string[];
}

export default function AdminDashboard() {
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [charts, setCharts] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`${LEGACY_API_URL}/kpis`).then((res) => res.json()),
      fetch(`${LEGACY_API_URL}/charts`).then((res) => res.json()),
    ])
      .then(([kpiData, chartData]) => {
        setKpis(kpiData);
        setCharts(chartData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6">Dashboard Geral</h2>
      {loading ? (
        <div>Carregando KPIs e gráficos...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {kpis.map((k, idx) => (
              <a
                key={idx}
                href={k.link || "#"}
                className="bg-white rounded-lg shadow p-4 flex flex-col items-center justify-center hover:bg-blue-50 transition"
              >
                {k.icon && <span className={`mb-2 text-2xl ${k.icon}`}></span>}
                <span className="text-lg font-bold">{k.value}</span>
                <span className="text-xs text-gray-500 mt-1">{k.label}</span>
              </a>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {charts.map((c, idx) => (
              <div key={idx} className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold mb-2">{c.label}</h3>
                <div className="w-full h-40 bg-gray-100 flex items-center justify-center">
                  {/* Aqui pode ser integrado um gráfico real (ex: Chart.js) */}
                  <span className="text-gray-400">[Gráfico: {c.label}]</span>
                </div>
                <div className="flex gap-2 mt-2 text-xs text-gray-500">
                  {c.categories.map((cat, i) => (
                    <span key={i}>{cat}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
