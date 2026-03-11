"use client";

import { useMemo, useState } from 'react';
import { useApiQuery } from '@/hooks/useApi';
import { endpoints } from '@/services/endpoints';
import type { PeriodReport, ReportsOverview } from '@/types/api';
import { authFetch } from '@/services/auth-fetch';

type PeriodKey = 'daily' | 'weekly' | 'monthly';

function money(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function percent(value: number) {
  return `${((value || 0) * 100).toFixed(1)}%`;
}

function toCsv(rows: Array<Array<string | number>>) {
  return rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
}

export default function CrmReportsPage() {
  const [period, setPeriod] = useState<PeriodKey>('weekly');
  const [emailTo, setEmailTo] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { data: overview, isLoading, error, refetch } = useApiQuery<ReportsOverview>(
    ['crm-reports-overview'],
    endpoints.admin.crmReportsOverview,
  );

  const current = useMemo<PeriodReport | null>(() => {
    if (!overview) return null;
    return overview[period] as PeriodReport;
  }, [overview, period]);

  const exportCurrentAsJson = () => {
    if (!current) return;
    const blob = new Blob([JSON.stringify(current, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crm-report-${period}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCurrentAsCsv = () => {
    if (!current) return;

    const rows: Array<Array<string | number>> = [
      ['metric', 'value'],
      ['ordersPlaced', current.ordersPlaced],
      ['ordersSold', current.ordersSold],
      ['ordersCancelled', current.ordersCancelled],
      ['soldRevenue', current.soldRevenue],
      ['productsSoldQuantity', current.productsSoldQuantity],
      ['productsCancelledQuantity', current.productsCancelledQuantity],
      ['cartItemsAdded', current.cartItemsAdded],
      ['cartItemsOpen', current.cartItemsOpen],
      ['cartItemsAbandoned', current.cartItemsAbandoned],
      ['signups', current.signups],
      ['productViews', current.productViews],
      ['wishlistAdds', current.wishlistAdds],
      ['cartToSaleConversionRate', current.cartToSaleConversionRate],
      ['cancelRate', current.cancelRate],
      ['cartAbandonRate', current.cartAbandonRate],
      [],
      ['topSoldProducts'],
      ['productId', 'productName', 'category', 'quantity', 'revenue'],
      ...current.topSoldProducts.map((p) => [p.productId, p.productName, p.category, p.quantity, p.revenue]),
    ];

    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crm-report-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sendEmail = async () => {
    if (!emailTo.trim()) return;
    setSending(true);
    setMessage(null);

    try {
      const res = await authFetch(endpoints.admin.crmReportsOverviewEmail, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: emailTo.trim() }),
      });

      if (!res.ok) {
        setMessage('Falha ao enviar relatório por email.');
      } else {
        setMessage('Relatório enviado por email com sucesso.');
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Relatórios CRM</h2>
          <p className="text-sm text-slate-400">KPIs de receita, conversão, abandono e performance de produtos.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void refetch()} className="rounded border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800">
            Atualizar
          </button>
          <button onClick={exportCurrentAsJson} disabled={!current} className="rounded border border-slate-700 px-3 py-2 text-sm text-slate-200 disabled:opacity-50 hover:bg-slate-800">
            Exportar JSON
          </button>
          <button onClick={exportCurrentAsCsv} disabled={!current} className="rounded border border-slate-700 px-3 py-2 text-sm text-slate-200 disabled:opacity-50 hover:bg-slate-800">
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        {(['daily', 'weekly', 'monthly'] as PeriodKey[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={`rounded px-3 py-2 text-sm font-medium ${
              period === p ? 'bg-blue-600 text-white' : 'border border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {p === 'daily' ? 'Diário' : p === 'weekly' ? 'Semanal' : 'Mensal'}
          </button>
        ))}
      </div>

      {isLoading && <div className="text-sm text-slate-400">Carregando relatório...</div>}
      {error && <div className="text-sm text-red-400">Erro ao carregar relatório.</div>}

      {!isLoading && current && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard label="Receita vendida" value={money(current.soldRevenue)} />
            <MetricCard label="Pedidos vendidos" value={String(current.ordersSold)} />
            <MetricCard label="Conversão carrinho → venda" value={percent(current.cartToSaleConversionRate)} />
            <MetricCard label="Abandono de carrinho" value={percent(current.cartAbandonRate)} />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard label="Pedidos criados" value={String(current.ordersPlaced)} />
            <MetricCard label="Pedidos cancelados" value={String(current.ordersCancelled)} />
            <MetricCard label="Taxa de cancelamento" value={percent(current.cancelRate)} />
            <MetricCard label="Itens vendidos" value={String(current.productsSoldQuantity)} />
            <MetricCard label="Itens cancelados" value={String(current.productsCancelledQuantity)} />
            <MetricCard label="Novos cadastros" value={String(current.signups)} />
            <MetricCard label="Visualizações de produto" value={String(current.productViews)} />
            <MetricCard label="Adições à wishlist" value={String(current.wishlistAdds)} />
            <MetricCard label="Carrinhos abandonados" value={String(current.cartItemsAbandoned)} />
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-200">Top produtos vendidos</h3>
            {current.topSoldProducts.length === 0 ? (
              <p className="text-sm text-slate-400">Sem dados no período selecionado.</p>
            ) : (
              <div className="overflow-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="text-left text-slate-400">
                      <th className="border-b border-slate-800 px-2 py-2">Produto</th>
                      <th className="border-b border-slate-800 px-2 py-2">Categoria</th>
                      <th className="border-b border-slate-800 px-2 py-2">Quantidade</th>
                      <th className="border-b border-slate-800 px-2 py-2">Receita</th>
                    </tr>
                  </thead>
                  <tbody>
                    {current.topSoldProducts.map((p) => (
                      <tr key={`${p.productId}-${p.productName}`} className="text-slate-200">
                        <td className="border-b border-slate-800 px-2 py-2">{p.productName}</td>
                        <td className="border-b border-slate-800 px-2 py-2">{p.category}</td>
                        <td className="border-b border-slate-800 px-2 py-2">{p.quantity}</td>
                        <td className="border-b border-slate-800 px-2 py-2">{money(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-200">Insights automáticos</h3>
            {current.insights.length === 0 ? (
              <p className="text-sm text-slate-400">Sem insights gerados para este período.</p>
            ) : (
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
                {current.insights.map((insight, index) => (
                  <li key={`${index}-${insight}`}>{insight}</li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <p className="mb-2 text-sm font-semibold">Enviar relatório por email</p>
        <div className="flex flex-col gap-2 md:flex-row">
          <input
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            placeholder="email@dominio.com"
            value={emailTo}
            onChange={(e) => setEmailTo(e.target.value)}
          />
          <button onClick={sendEmail} disabled={sending} className="rounded bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-60">
            {sending ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
        {message && <p className="mt-2 text-sm text-slate-300">{message}</p>}
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}
