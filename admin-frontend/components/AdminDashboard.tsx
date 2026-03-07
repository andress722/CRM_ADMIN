// Dashboard geral do admin: KPIs, graficos, atalhos
import { useEffect, useState } from "react";
import { ADMIN_API_URL } from "../lib/legacy-api";

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
    fetch(`${ADMIN_API_URL}/admin/overview`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`http_${res.status}`);
        return res.json();
      })
      .then((data) => {
        setKpis([
          { label: "Receita", value: `R$ ${Number(data.totalRevenue || 0).toFixed(2)}` },
          { label: "Pedidos", value: data.totalOrders ?? 0 },
          { label: "Clientes", value: data.totalCustomers ?? 0 },
          { label: "Ticket medio", value: `R$ ${Number(data.averageOrderValue || 0).toFixed(2)}` },
        ]);

        const recentOrders = Array.isArray(data.recentOrders) ? data.recentOrders : [];
        const topProducts = Array.isArray(data.topProducts) ? data.topProducts : [];

        setCharts([
          {
            label: "Pedidos recentes",
            categories: recentOrders.map((o: { id?: string }) => o.id?.slice(0, 8) ?? "-"),
            data: recentOrders.map((o: { amount?: number }) => Number(o.amount || 0)),
          },
          {
            label: "Top produtos",
            categories: topProducts.map((p: { name?: string }) => p.name ?? "Produto"),
            data: topProducts.map((p: { sales?: number }) => Number(p.sales || 0)),
          },
        ]);

        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6">Dashboard Geral</h2>
      {loading ? (
        <div>Carregando KPIs e graficos...</div>
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
                  <span className="text-gray-400">[Grafico: {c.label}]</span>
                </div>
                <div className="flex gap-2 mt-2 text-xs text-gray-500 flex-wrap">
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

