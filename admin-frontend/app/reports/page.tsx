"use client";

import { AuthService } from "@/services/auth";
import { endpoints } from "@/services/endpoints";
import { Chart, registerables } from "chart.js";
import ExcelJS from "exceljs";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
Chart.register(...registerables);

type ReportItem = {
  id: string | number;
  name: string;
  type: string;
  date: string;
  value?: number | null;
  downloadUrl?: string;
};

export default function ReportsPage() {
  const token = AuthService.getToken();
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(() => Boolean(token));
  const [error, setError] = useState<string | null>(() =>
    token ? null : "Usuário não autenticado.",
  );
  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [period, setPeriod] = useState({ start: "", end: "" });
  const chartRef = useRef<HTMLCanvasElement>(null);
  const pieRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!token) return;
    let url = endpoints.admin.reports;
    const params = [];
    if (filter) params.push(`filter=${encodeURIComponent(filter)}`);
    if (typeFilter) params.push(`type=${encodeURIComponent(typeFilter)}`);
    if (period.start) params.push(`start=${encodeURIComponent(period.start)}`);
    if (period.end) params.push(`end=${encodeURIComponent(period.end)}`);
    if (params.length) url += "?" + params.join("&");
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setReports(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Erro ao carregar relatórios.");
        setLoading(false);
      });
  }, [filter, period.end, period.start, token, typeFilter]);

  useEffect(() => {
    if (!reports.length || !pieRef.current) return;
    const ctx = pieRef.current.getContext("2d");
    if (!ctx) return;
    const typeCounts: Record<string, number> = {};
    reports.forEach((r) => {
      typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
    });
    const chart = new Chart(ctx, {
      type: "pie",
      data: {
        labels: Object.keys(typeCounts),
        datasets: [
          {
            label: "Por Tipo",
            data: Object.values(typeCounts),
            backgroundColor: [
              "rgba(37,99,235,0.7)",
              "rgba(16,185,129,0.7)",
              "rgba(234,179,8,0.7)",
              "rgba(239,68,68,0.7)",
              "rgba(59,130,246,0.7)",
            ],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "bottom" },
        },
      },
    });
    return () => chart.destroy();
  }, [reports]);

  useEffect(() => {
    if (!reports.length || !chartRef.current) return;
    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;
    const chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: reports.map((r) => r.name),
        datasets: [
          {
            label: "Quantidade",
            data: reports.map((r) => r.value || 0),
            backgroundColor: "rgba(37, 99, 235, 0.7)",
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
        },
      },
    });
    return () => chart.destroy();
  }, [reports]);

  const exportCSV = () => {
    if (!reports.length) return;
    const header = ["Nome", "Tipo", "Data", "Valor"];
    const rows = reports.map((r) => [
      r.name,
      r.type,
      new Date(r.date).toLocaleString(),
      r.value ?? "",
    ]);
    const csv = [header, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "relatorios.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = async () => {
    if (!reports.length) return;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Relatórios");
    sheet.columns = [
      { header: "Nome", key: "name", width: 24 },
      { header: "Tipo", key: "type", width: 16 },
      { header: "Data", key: "date", width: 24 },
      { header: "Valor", key: "value", width: 12 },
    ];
    reports.forEach((report) => {
      sheet.addRow({
        name: report.name,
        type: report.type,
        date: new Date(report.date).toLocaleString(),
        value: report.value ?? "",
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "relatorios.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div>Carregando relatórios...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!reports.length) return <div>Nenhum relatório encontrado.</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white border rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-4">Relatórios Customizados</h1>
      <div className="mb-4 flex gap-2 flex-wrap">
        <input
          type="text"
          placeholder="Filtrar por nome"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border rounded px-2 py-1"
        />
        <input
          type="text"
          placeholder="Filtrar por tipo"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border rounded px-2 py-1"
        />
        <input
          type="date"
          value={period.start}
          onChange={(e) => setPeriod((p) => ({ ...p, start: e.target.value }))}
          className="border rounded px-2 py-1"
        />
        <input
          type="date"
          value={period.end}
          onChange={(e) => setPeriod((p) => ({ ...p, end: e.target.value }))}
          className="border rounded px-2 py-1"
        />
        <button
          onClick={exportCSV}
          className="bg-blue-600 text-white px-4 py-1 rounded font-semibold"
        >
          Exportar CSV
        </button>
        <button
          onClick={exportExcel}
          className="bg-green-600 text-white px-4 py-1 rounded font-semibold"
        >
          Exportar Excel
        </button>
      </div>
      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <canvas ref={chartRef} height={120} />
        </div>
        <div>
          <canvas ref={pieRef} height={120} />
        </div>
      </div>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Nome</th>
            <th className="p-2 border">Tipo</th>
            <th className="p-2 border">Data</th>
            <th className="p-2 border">Valor</th>
            <th className="p-2 border">Ações</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr key={report.id}>
              <td className="p-2 border font-semibold">{report.name}</td>
              <td className="p-2 border">{report.type}</td>
              <td className="p-2 border">
                {new Date(report.date).toLocaleString()}
              </td>
              <td className="p-2 border">{report.value ?? "-"}</td>
              <td className="p-2 border">
                {report.downloadUrl ? (
                  <Link
                    href={report.downloadUrl}
                    className="text-blue-600 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Baixar
                  </Link>
                ) : (
                  <span className="text-gray-400">N/A</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
