// app/admin/page.tsx

'use client';

import { useApiQuery } from '@/hooks/useApi';
import { endpoints } from '@/services/endpoints';
import { DashboardStats } from '@/types/api';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function AdminOverviewPage() {
  const { data: stats, isLoading, error } = useApiQuery<DashboardStats>(
    ['dashboard', 'stats'],
    endpoints.admin.overview
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Skeleton Cards */}
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
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard Overview</h1>
        <p className="text-slate-400">Welcome back! Here is your business performance.</p>
      </div>

      {/* KPI Cards */}
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
            {/* Adiciona mais informações detalhadas */}
            {index === 0 && (
              <p className="text-xs text-blue-400 mt-2">Faturamento total do período</p>
            )}
            {index === 1 && (
              <p className="text-xs text-green-400 mt-2">Pedidos realizados</p>
            )}
            {index === 2 && (
              <p className="text-xs text-cyan-400 mt-2">Novos clientes cadastrados</p>
            )}
            {index === 3 && (
              <p className="text-xs text-yellow-400 mt-2">Taxa de conversão</p>
            )}
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-blue-500/0 to-cyan-500/0 group-hover:from-blue-500/5 group-hover:to-cyan-500/5 transition-all duration-300" />
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
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

        {/* Top Products */}
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
    </div>
  );
}
