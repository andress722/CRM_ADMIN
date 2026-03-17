// app/admin/page.tsx

'use client';

import { useMemo, useState } from 'react';
import { useApiMutation, useApiQuery } from '@/hooks/useApi';
import { endpoints } from '@/services/endpoints';
import { AdminOpsOverview, DashboardStats, PeriodReport, ReportsOverview } from '@/types/api';
import { TrendingDown, TrendingUp } from 'lucide-react';

type PeriodKey = 'daily' | 'weekly' | 'monthly';

export default function AdminOverviewPage() {
  const [period, setPeriod] = useState<PeriodKey>('daily');
  const [reportEmail, setReportEmail] = useState('');

  const { data: stats, isLoading, error } = useApiQuery<DashboardStats>(
    ['dashboard', 'stats'],
    endpoints.admin.overview,
  );

  const {
    data: reports,
    isLoading: isReportsLoading,
    error: reportsError,
    refetch: refetchReports,
  } = useApiQuery<ReportsOverview>(
    ['dashboard', 'reports-overview'],
    endpoints.admin.reportsOverview,
  );

  const {
    data: ops,
    isLoading: isOpsLoading,
    error: opsError,
    refetch: refetchOps,
  } = useApiQuery<AdminOpsOverview>(
    ['dashboard', 'ops-overview'],
    endpoints.admin.opsOverview,
  );

  const sendReportMutation = useApiMutation<
    { message: string; to: string; subject: string },
    { to: string; subject?: string }
  >('post');

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
            className="h-24 animate-pulse rounded-lg bg-gradient-to-br from-slate-800 to-slate-700"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6">
        <p className="text-red-400">Failed to load dashboard statistics</p>
        <p className="mt-2 text-sm text-red-400/80">{error.message}</p>
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
        <h1 className="mb-2 text-3xl font-bold text-white">Dashboard Overview</h1>
        <p className="text-slate-400">Welcome back! Here is your business performance.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, index) => (
          <div
            key={index}
            className="group relative rounded-lg border border-white/10 bg-gradient-to-br from-slate-800/50 to-slate-700/30 p-6 transition-all duration-300 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10"
          >
            <div className="mb-4 flex items-start justify-between">
              <span className="text-3xl">{kpi.icon}</span>
              {kpi.change !== 0 && (
                <div
                  className={`flex items-center gap-1 text-sm font-semibold ${
                    kpi.change > 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {kpi.change > 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  {Math.abs(kpi.change)}%
                </div>
              )}
            </div>
            <p className="mb-1 text-sm text-slate-400">{kpi.label}</p>
            <p className="text-2xl font-bold text-white">{kpi.value}</p>
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-blue-500/0 to-cyan-500/0 transition-all duration-300 group-hover:from-blue-500/5 group-hover:to-cyan-500/5" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-gradient-to-br from-slate-800/50 to-slate-700/30 p-6">
          <h2 className="mb-4 text-lg font-bold text-white">Recent Orders</h2>
          <div className="space-y-3">
            {stats.recentOrders?.slice(0, 5).map((order, index) => (
              <button
                key={index}
                className="flex w-full items-center justify-between rounded-lg bg-white/5 p-3 text-left transition-colors hover:bg-blue-900/20"
                onClick={() => {
                  window.location.href = `/admin/orders?orderId=${order.id}`;
                }}
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
          <h2 className="mb-4 text-lg font-bold text-white">Top Products</h2>
          <div className="space-y-3">
            {stats.topProducts?.slice(0, 5).map((product, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg bg-white/5 p-3 transition-colors hover:bg-white/10"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{product.name}</p>
                  <p className="text-xs text-slate-400">{product.sales} sales</p>
                </div>
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                    style={{ width: `${Math.min(product.sales, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="space-y-4 rounded-lg border border-white/10 bg-gradient-to-br from-slate-900/70 to-slate-800/40 p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Operational Health</h2>
            <p className="text-sm text-slate-400">Erros, latencia, backlog de jobs e entrega de webhooks em uma visao unica.</p>
          </div>
          <button
            className="rounded border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
            onClick={() => refetchOps()}
          >
            Atualizar saude operacional
          </button>
        </div>

        {isOpsLoading && <p className="text-sm text-slate-400">Carregando operacao...</p>}
        {opsError && <p className="text-sm text-red-400">Falha ao carregar operacao: {opsError.message}</p>}

        {ops && (
          <>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <OpsMetricCard
                label="API 5xx"
                value={ops.slo.total5xx}
                tone={ops.slo.total5xx > 0 ? 'danger' : 'ok'}
                detail={`${(ops.slo.errorRate * 100).toFixed(2)}% de erro servidor`}
              />
              <OpsMetricCard
                label="Latencia P95"
                value={`${ops.slo.p95LatencyMs.toFixed(0)} ms`}
                tone={ops.slo.p95LatencyMs >= 1200 ? 'danger' : ops.slo.p95LatencyMs >= 800 ? 'warn' : 'ok'}
                detail={`media ${ops.slo.avgLatencyMs.toFixed(0)} ms em ${ops.slo.totalResponses} respostas`}
              />
              <OpsMetricCard
                label="Fila de webhooks"
                value={ops.webhooks.pendingDeliveries}
                tone={ops.webhooks.pendingDeliveries > 0 ? 'warn' : 'ok'}
                detail={`${ops.webhooks.failedDeliveriesLast24h} falhas nas ultimas 24h`}
              />
              <OpsMetricCard
                label="Backups"
                value={ops.backup.healthy ? 'OK' : 'Falha'}
                tone={ops.backup.healthy ? 'ok' : 'danger'}
                detail={ops.backup.message}
              />
            </div>

            <div className="rounded border border-white/10 bg-white/5 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white">Alertas operacionais</p>
                <span className="text-xs text-slate-400">Deploy failure segue dependente do CI</span>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
                <AlertRow title="5xx" alert={ops.alerts.api5xx} />
                <AlertRow title="P95" alert={ops.alerts.apiP95Latency} />
                <AlertRow title="Webhooks" alert={ops.alerts.webhookBacklog} />
                <AlertRow title="Backup" alert={ops.alerts.backupHealth} />
                <AlertRow title="Deploy" alert={ops.alerts.deployFailure} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded border border-white/10 bg-white/5 p-4">
                <p className="mb-3 text-sm font-semibold text-white">Top endpoints observados</p>
                <div className="space-y-3">
                  {ops.slo.topEndpoints.length === 0 && (
                    <p className="text-sm text-slate-400">Sem trafego suficiente para destacar endpoints.</p>
                  )}
                  {ops.slo.topEndpoints.map((endpoint) => (
                    <div key={`${endpoint.method}-${endpoint.path}`} className="rounded border border-white/10 bg-slate-950/40 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-medium text-white">{endpoint.method} {endpoint.path}</p>
                        <span className="text-xs text-slate-400">{endpoint.requestCount} req</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                        <span>avg {endpoint.avgLatencyMs.toFixed(0)} ms | p95 {endpoint.p95LatencyMs.toFixed(0)} ms</span>
                        <span>{(endpoint.errorRate * 100).toFixed(1)}% erro</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded border border-white/10 bg-white/5 p-4">
                <p className="mb-3 text-sm font-semibold text-white">Backlog de jobs</p>
                <div className="space-y-2 text-sm text-slate-300">
                  <JobRow label="Assinaturas vencidas para cobranca" value={ops.jobs.dueSubscriptions} />
                  <JobRow label="Assinaturas em retentativa" value={ops.jobs.retryingSubscriptions} />
                  <JobRow label="Carrinhos abandonados" value={ops.jobs.staleCartUsers} />
                  <JobRow label="E-mails falhos 24h" value={ops.jobs.failedEmailsLast24h} />
                </div>
              </div>

              <div className="rounded border border-white/10 bg-white/5 p-4">
                <p className="mb-3 text-sm font-semibold text-white">Entrega de webhooks</p>
                <div className="space-y-2 text-sm text-slate-300">
                  <JobRow label="Endpoints ativos" value={ops.webhooks.activeEndpoints} />
                  <JobRow label="Pendentes" value={ops.webhooks.pendingDeliveries} />
                  <JobRow label="Sucesso 24h" value={ops.webhooks.successfulDeliveriesLast24h} />
                  <JobRow label="Falhas 24h" value={ops.webhooks.failedDeliveriesLast24h} />
                </div>
                <p className="mt-4 text-xs text-slate-500">
                  Ultima falha: {ops.webhooks.latestFailureAtUtc ? new Date(ops.webhooks.latestFailureAtUtc).toLocaleString() : 'nenhuma registrada'}
                </p>
              </div>
            </div>
          </>
        )}
      </section>

      <div className="space-y-4 rounded-lg border border-white/10 bg-gradient-to-br from-slate-800/50 to-slate-700/30 p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Reports Overview</h2>
            <p className="text-sm text-slate-400">Daily, weekly and monthly report with sales, cancellations and cart behavior.</p>
          </div>
          <div className="flex gap-2">
            {(['daily', 'weekly', 'monthly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded border px-3 py-1.5 text-sm ${period === p ? 'border-blue-500 bg-blue-600 text-white' : 'border-white/10 bg-white/5 text-slate-300'}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {isReportsLoading && <p className="text-slate-400">Loading reports...</p>}
        {reportsError && <p className="text-sm text-red-400">Failed to load report: {reportsError.message}</p>}

        {selectedReport && (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <MetricCard label="Sold Revenue" value={`$${selectedReport.soldRevenue.toFixed(2)}`} />
              <MetricCard label="Orders Sold" value={selectedReport.ordersSold} />
              <MetricCard label="Orders Cancelled" value={selectedReport.ordersCancelled} />
              <MetricCard label="Cart Abandon" value={`${(selectedReport.cartAbandonRate * 100).toFixed(1)}%`} />
              <MetricCard label="Views" value={selectedReport.productViews} />
              <MetricCard label="Favorites" value={selectedReport.wishlistAdds} />
              <MetricCard label="Added To Cart" value={selectedReport.cartItemsAdded} />
              <MetricCard label="Signups" value={selectedReport.signups} />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <SimpleTopList title="Top Sold" items={selectedReport.topSoldProducts} />
              <SimpleTopList title="Top Added To Cart" items={selectedReport.topAddedToCartProducts} />
              <SimpleTopList title="Top Cancelled" items={selectedReport.topCancelledProducts} />
              <SimpleTopList title="Top Viewed" items={selectedReport.topViewedProducts} />
            </div>

            {selectedReport.insights.length > 0 && (
              <div className="rounded border border-amber-500/30 bg-amber-500/10 p-3">
                <p className="mb-1 font-medium text-amber-300">Insights</p>
                <ul className="space-y-1 text-sm text-amber-100">
                  {selectedReport.insights.map((insight, idx) => (
                    <li key={idx}>- {insight}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        <div className="flex flex-col gap-2 border-t border-white/10 pt-4 lg:flex-row lg:items-center">
          <input
            type="email"
            value={reportEmail}
            onChange={(e) => setReportEmail(e.target.value)}
            placeholder="admin@empresa.com"
            className="flex-1 rounded border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white"
          />
          <button
            className="rounded bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500 disabled:opacity-60"
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
            className="rounded border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
            onClick={() => refetchReports()}
          >
            Atualizar
          </button>
        </div>

        {sendReportMutation.isSuccess && (
          <p className="text-sm text-green-400">Relatorio enviado com sucesso.</p>
        )}
        {sendReportMutation.isError && (
          <p className="text-sm text-red-400">Falha ao enviar relatorio.</p>
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
      <p className="mb-2 text-sm font-semibold text-white">{title}</p>
      <div className="space-y-2">
        {items.slice(0, 5).map((item, idx) => (
          <div key={`${item.productName}-${idx}`} className="flex items-center justify-between text-sm">
            <span className="truncate pr-3 text-slate-200">{item.productName}</span>
            <span className="text-slate-400">{item.quantity}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OpsMetricCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string | number;
  detail: string;
  tone: 'ok' | 'warn' | 'danger';
}) {
  const toneClass = tone === 'danger'
    ? 'border-red-500/30 bg-red-500/10'
    : tone === 'warn'
      ? 'border-amber-500/30 bg-amber-500/10'
      : 'border-emerald-500/30 bg-emerald-500/10';

  return (
    <div className={`rounded border p-4 ${toneClass}`}>
      <p className="text-xs uppercase tracking-wide text-slate-300">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-300">{detail}</p>
    </div>
  );
}

function JobRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded border border-white/10 bg-slate-950/30 px-3 py-2">
      <span className="text-slate-300">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

function AlertRow({
  title,
  alert,
}: {
  title: string;
  alert: { triggered: boolean; message: string };
}) {
  const toneClass = alert.triggered
    ? 'border-red-500/30 bg-red-500/10 text-red-100'
    : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100';

  return (
    <div className={['rounded border px-3 py-2', toneClass].join(' ')}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wide">{title}</span>
        <span className="text-[11px] font-medium">{alert.triggered ? 'acionado' : 'ok'}</span>
      </div>
      <p className="mt-2 text-xs opacity-90">{alert.message}</p>
    </div>
  );
}
