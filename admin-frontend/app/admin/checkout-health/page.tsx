'use client';

import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCcw, ShieldCheck } from 'lucide-react';
import { useApiQuery } from '@/hooks/useApi';
import { endpoints } from '@/services/endpoints';

type AntiAbuseRouteClass = {
  key: string;
  label: string;
  rulesCount: number;
  minLimit: number;
  maxLimit: number;
  endpoints: string[];
  coupledAlerts: string[];
  expectedAlertCoverage: boolean;
};

type CheckoutHealthResponse = {
  correlationId: string;
  environment: string;
  auth: {
    authenticated: boolean;
    userId: string | null;
    userExists: boolean;
  };
  checkout: {
    paymentProvider: string;
    allowStubOutsideDevelopment: boolean;
    mercadoPagoTokenConfigured: boolean;
    mercadoPagoTokenPreview: string;
    mercadoPagoWebhookUrlConfigured: boolean;
  };
  captcha: {
    enabled: boolean;
    secretConfigured: boolean;
  };
  antiAbuse: {
    routeClasses: AntiAbuseRouteClass[];
    alerts: string[];
    rateLimitRulesVersioned: boolean;
  };
  warnings: string[];
  healthy: boolean;
};

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold ${
        ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
      }`}
    >
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

export default function CheckoutHealthPage() {
  const { data, isLoading, error, refetch, isFetching } = useApiQuery<CheckoutHealthResponse>(
    ['admin-checkout-health'],
    endpoints.admin.checkoutHealth,
    {
      staleTime: 0,
      refetchOnWindowFocus: false,
    }
  );

  const warningCount = useMemo(() => data?.warnings?.length ?? 0, [data]);
  const antiAbuseCount = useMemo(() => data?.antiAbuse.routeClasses.length ?? 0, [data]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Checkout Health</h1>
          <p className="text-sm text-slate-400">Diagnóstico de autenticação, pagamento, captcha e antiabuso por classe de rota.</p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 hover:border-slate-500"
          disabled={isFetching}
        >
          <RefreshCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </header>

      {isLoading && <div className="rounded border border-slate-700 bg-slate-900 p-4 text-slate-300">Carregando diagnóstico...</div>}

      {error && (
        <div className="rounded border border-red-500/30 bg-red-500/10 p-4 text-red-300">
          Falha ao carregar diagnóstico: {error.message}
        </div>
      )}

      {data && (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded border border-slate-700 bg-slate-900 p-4">
              <p className="text-xs text-slate-400">Saúde geral</p>
              <div className="mt-2">
                <StatusBadge ok={data.healthy} label={data.healthy ? 'Healthy' : 'Issues found'} />
              </div>
              <p className="mt-2 text-xs text-slate-500">Warnings: {warningCount}</p>
            </div>

            <div className="rounded border border-slate-700 bg-slate-900 p-4">
              <p className="text-xs text-slate-400">Ambiente</p>
              <p className="mt-2 text-sm font-semibold text-white">{data.environment}</p>
              <p className="mt-2 text-xs text-slate-500 break-all">Correlation: {data.correlationId}</p>
            </div>

            <div className="rounded border border-slate-700 bg-slate-900 p-4">
              <p className="text-xs text-slate-400">Autenticação</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusBadge ok={data.auth.authenticated} label="Token" />
                <StatusBadge ok={data.auth.userExists} label="User exists" />
              </div>
              <p className="mt-2 text-xs text-slate-500 break-all">UserId: {data.auth.userId ?? '(none)'}</p>
            </div>

            <div className="rounded border border-slate-700 bg-slate-900 p-4">
              <p className="text-xs text-slate-400">Antiabuso</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusBadge ok={data.antiAbuse.rateLimitRulesVersioned} label="Rules versioned" />
              </div>
              <p className="mt-2 text-xs text-slate-500">Classes mapeadas: {antiAbuseCount}</p>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded border border-slate-700 bg-slate-900 p-4 space-y-3">
              <h2 className="text-sm font-semibold text-white">Configuração de checkout</h2>
              <div className="text-sm text-slate-300 space-y-1">
                <p>
                  <span className="text-slate-400">Payment provider:</span> {data.checkout.paymentProvider}
                </p>
                <p>
                  <span className="text-slate-400">Allow stub outside dev:</span>{' '}
                  {String(data.checkout.allowStubOutsideDevelopment)}
                </p>
                <p>
                  <code className="rounded bg-slate-800 px-1 py-0.5 text-xs">{data.checkout.mercadoPagoTokenPreview}</code>
                </p>
              </div>
            </div>

            <div className="rounded border border-slate-700 bg-slate-900 p-4 space-y-3">
              <h2 className="text-sm font-semibold text-white">Captcha</h2>
              <div className="flex flex-wrap gap-2">
                <StatusBadge ok={data.captcha.enabled} label="Enabled" />
                <StatusBadge ok={data.captcha.secretConfigured} label="Secret configured" />
              </div>
              <p className="text-xs text-slate-500">
                Se captcha estiver habilitado sem secret, checkout/login podem falhar por validação.
              </p>
            </div>
          </section>

          <section className="rounded border border-slate-700 bg-slate-900 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-slate-300" />
              <h2 className="text-sm font-semibold text-white">Antiabuso por classe de rota</h2>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {data.antiAbuse.routeClasses.map((routeClass) => (
                <div key={routeClass.key} className="rounded border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-300">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-white">{routeClass.label}</p>
                    <StatusBadge
                      ok={!routeClass.expectedAlertCoverage || routeClass.coupledAlerts.length > 0}
                      label={routeClass.coupledAlerts.length > 0 ? 'Alert coupled' : 'No alert'}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {routeClass.rulesCount} regras, limite min {routeClass.minLimit}/janela, max {routeClass.maxLimit}/janela
                  </p>
                  <p className="mt-2 text-xs text-slate-400">Endpoints:</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {routeClass.endpoints.map((endpoint) => (
                      <code key={endpoint} className="rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-300">{endpoint}</code>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-slate-400">Alertas acoplados:</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {routeClass.coupledAlerts.length > 0 ? routeClass.coupledAlerts.map((alert) => (
                      <code key={alert} className="rounded bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-300">{alert}</code>
                    )) : <span className="text-xs text-slate-500">Nenhum alerta específico encontrado.</span>}
                  </div>
                </div>
              ))}
            </div>
            <div>
              <p className="mb-2 text-xs text-slate-400">Alertas disponíveis no pacote de observabilidade</p>
              <div className="flex flex-wrap gap-2">
                {data.antiAbuse.alerts.map((alert) => (
                  <code key={alert} className="rounded bg-slate-800 px-2 py-1 text-[11px] text-slate-300">{alert}</code>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded border border-slate-700 bg-slate-900 p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
              <ShieldCheck className="h-4 w-4" />
              Warnings detectados
            </h2>
            {warningCount === 0 ? (
              <div className="rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                Nenhum warning. Ambiente consistente para checkout e antiabuso.
              </div>
            ) : (
              <ul className="space-y-2 text-sm text-amber-300">
                {data.warnings.map((warning, idx) => (
                  <li key={`${warning}-${idx}`} className="rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                    {warning}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
