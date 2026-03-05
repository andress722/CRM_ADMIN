// app/admin/page.tsx

'use client';

import { useMemo, useState } from 'react';
import { useApiMutation, useApiQuery } from '@/hooks/useApi';
import { endpoints } from '@/services/endpoints';
import { DashboardStats, PeriodReport, ReportsOverview } from '@/types/api';
import { TrendingUp, TrendingDown } from 'lucide-react';

type PeriodKey = 'daily' | 'weekly' | 'monthly';

export default function AdminOverviewPage() {
  const [period, setPeriod] = useState<PeriodKey>('daily');
  const [reportEmail, setReportEmail] = useState('');

  const { data: stats, isLoading, error } = useApiQuery<DashboardStats>(
    ['dashboard', 'stats'],
    endpoints.admin.overview
  );

  const {
    data: reports,
    isLoading: isReportsLoading,
    error: reportsError,
    refetch: refetchReports,
  } = useApiQuery<ReportsOverview>(
    ['dashboard', 'reports-overview'],
    endpoints.admin.reportsOverview
  );

  const sendReportMutation = useApiMutation<{ message: string; to: string; subject: string }, { to: string; subject?: string }>('post');

  const selectedReport: PeriodReport | null = useMemo(() => {
    if (!reports) return null;
    return reports[period] as PeriodReport;
  }, [reports, period]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-6">
        <p className="text-red-400">Failed to load dashboard statistics</p>
        <p className="text-sm text-red-400/80 mt-2">{error.message}</p>
      </div>
    );
  }

  if (!stats) {
    return <div className="text-slate-400">No data available</div>;
  }

  const kpis = [
    {
      label: 'Total Revenue',
      value: `$${stats.totalRevenue?.toLocaleString() || '0'}`,
      change: stats.revenueChange || 0,
      icon: '💰',
    },
    {
      label: 'Total Orders',
      value: stats.totalOrders || 0,
      change: stats.ordersChange || 0,
      icon: '📦',
    },
    {
      label: 'New Customers',
      value: stats.newCustomers || 0,
      change: stats.customersChange || 0,
      icon: '👥',
    },
    {
      label: 'Conversion Rate',
      value: `${stats.conversionRate || 0}%`,
      change: stats.conversionChange || 0,
      icon: '📊',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard Overview</h1>
        <p className="text-slate-400">Welcome back! Here is your business performance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, index) => (
          <div
            key={index}
            className="group relative rounded-lg border border-white/10 bg-gradient-to-br from-slate-800/50 to-slate-700/30 p-6 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10"
          >
            <div className="flex items-start justify-between mb-4">
              <span className="text-3xl">{kpi.icon}</span>
              {kpi.change !== 0 && (
                <div
                  className={`flex items-center gap-1 text-sm font-semibold ${
                    kpi.change > 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {kpi.change > 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  {Math.abs(kpi.change)}%
                </div>
              )}
            </div>
            <p className="text-slate-400 text-sm mb-1">{kpi.label}</p>
            <p className="text-2xl font-bold text-white">{kpi.value}</p>
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-blue-500/0 to-cyan-500/0 group-hover:from-blue-500/5 group-hover:to-cyan-500/5 transition-all duration-300" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border border-white/10 bg-gradient-to-br from-slate-800/50 to-slate-700/30 p-6">
          <h2 className="text-lg font-bold text-white mb-4">Recent Orders</h2>
          <div className="space-y-3">
            {stats.recentOrders?.slice(0, 5).map((order, index) => (
              <button
                key={index}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-blue-900/20 transition-colors text-left"
                onClick={() => window.location.href = `/admin/orders?orderId=${order.id}`}
                title="Abrir detalhes do pedido"
              >
                <div>
                  <p className="text-sm font-medium text-white">Order #{order.id}</p>
                  <p className="text-xs text-slate-400">{order.customerName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">${order.amount}</p>
                  <p
                    className={`text-xs ${
                      order.status === 'delivered'
                        ? 'text-green-400'
                        : order.status === 'cancelled'
                          ? 'text-red-400'
                          : 'text-blue-400'
                    }`}
                  >
                    {order.status}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-gradient-to-br from-slate-800/50 to-slate-700/30 p-6">
          <h2 className="text-lg font-bold text-white mb-4">Top Products</h2>
          <div className="space-y-3">
            {stats.topProducts?.slice(0, 5).map((product, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{product.name}</p>
                  <p className="text-xs text-slate-400">{product.sales} sales</p>
                </div>
                <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                    style={{ width: `${(product.sales / 100) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-gradient-to-br from-slate-800/50 to-slate-700/30 p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Reports Overview</h2>
            <p className="text-sm text-slate-400">Daily, weekly and monthly report with sales, cancellations and cart behavior.</p>
          </div>
          <div className="flex gap-2">
            {(['daily', 'weekly', 'monthly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded text-sm border ${period === p ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-slate-300'}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {isReportsLoading && <p className="text-slate-400">Loading reports...</p>}
        {reportsError && <p className="text-red-400 text-sm">Failed to load report: {reportsError.message}</p>}

        {selectedReport && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard label="Sold Revenue" value={`$${selectedReport.soldRevenue.toFixed(2)}`} />
              <MetricCard label="Orders Sold" value={selectedReport.ordersSold} />
              <MetricCard label="Orders Cancelled" value={selectedReport.ordersCancelled} />
              <MetricCard label="Cart Abandon" value={`${(selectedReport.cartAbandonRate * 100).toFixed(1)}%`} />
              <MetricCard label="Views" value={selectedReport.productViews} />
              <MetricCard label="Favorites" value={selectedReport.wishlistAdds} />
              <MetricCard label="Added To Cart" value={selectedReport.cartItemsAdded} />
              <MetricCard label="Signups" value={selectedReport.signups} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SimpleTopList title="Top Sold" items={selectedReport.topSoldProducts} />
              <SimpleTopList title="Top Added To Cart" items={selectedReport.topAddedToCartProducts} />
              <SimpleTopList title="Top Cancelled" items={selectedReport.topCancelledProducts} />
              <SimpleTopList title="Top Viewed" items={selectedReport.topViewedProducts} />
            </div>

            {selectedReport.insights.length > 0 && (
              <div className="rounded border border-amber-500/30 bg-amber-500/10 p-3">
                <p className="text-amber-300 font-medium mb-1">Insights</p>
                <ul className="text-sm text-amber-100 space-y-1">
                  {selectedReport.insights.map((insight, idx) => (
                    <li key={idx}>- {insight}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        <div className="border-t border-white/10 pt-4 flex flex-col lg:flex-row gap-2 lg:items-center">
          <input
            type="email"
            value={reportEmail}
            onChange={(e) => setReportEmail(e.target.value)}
            placeholder="admin@empresa.com"
            className="bg-slate-900/70 border border-white/10 rounded px-3 py-2 text-sm text-white flex-1"
          />
          <button
            className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-sm disabled:opacity-60"
            disabled={!reportEmail || sendReportMutation.isPending}
            onClick={async () => {
              await sendReportMutation.mutateAsync({
                url: endpoints.admin.reportsOverviewEmail,
                data: { to: reportEmail, subject: `Relatorio ${period}` },
              });
            }}
          >
            {sendReportMutation.isPending ? 'Enviando...' : 'Enviar Relatorio por Email'}
          </button>
          <button
            className="px-4 py-2 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm"
            onClick={() => refetchReports()}
          >
            Atualizar
          </button>
        </div>

        {sendReportMutation.isSuccess && (
          <p className="text-green-400 text-sm">Relatorio enviado com sucesso.</p>
        )}
        {sendReportMutation.isError && (
          <p className="text-red-400 text-sm">Falha ao enviar relatorio.</p>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded border border-white/10 bg-white/5 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function SimpleTopList({
  title,
  items,
}: {
  title: string;
  items: Array<{ productName: string; quantity: number; revenue: number }>;
}) {
  return (
    <div className="rounded border border-white/10 bg-white/5 p-3">
      <p className="text-sm font-semibold text-white mb-2">{title}</p>
      <div className="space-y-2">
        {items.slice(0, 5).map((item, idx) => (
          <div key={`${item.productName}-${idx}`} className="flex items-center justify-between text-sm">
            <span className="text-slate-200 truncate pr-3">{item.productName}</span>
            <span className="text-slate-400">{item.quantity}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
