'use client';

import React from 'react';
import { DashboardStatistics } from '@/lib/types';
import { TrendingUp, ShoppingCart, Clock, CheckCircle, DollarSign, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
  gradient: string;
  bgGradient: string;
}

function StatCard({ title, value, icon, trend, gradient, bgGradient }: StatCardProps) {
  return (
    <div className={`glass rounded-2xl p-6 border border-slate-600 overflow-hidden group hover:shadow-xl hover:shadow-blue-500/20 transition-all duration-300`}>
      <div className={`absolute inset-0 bg-gradient-to-r ${bgGradient} opacity-0 group-hover:opacity-5 transition-opacity`} />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
            <p className={`text-3xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>{value}</p>
          </div>
          <div className={`p-3 rounded-xl bg-gradient-to-r ${gradient} opacity-20 group-hover:opacity-30 transition-all`}>
            {icon}
          </div>
        </div>
        {trend !== undefined && (
          <div className="flex items-center space-x-2">
            {trend >= 0 ? (
              <>
                <ArrowUpRight className="text-emerald-400" size={16} />
                <span className="text-emerald-400 text-sm font-semibold">+{trend}%</span>
              </>
            ) : (
              <>
                <ArrowDownLeft className="text-red-400" size={16} />
                <span className="text-red-400 text-sm font-semibold">{trend}%</span>
              </>
            )}
            <span className="text-slate-500 text-xs">vs mês anterior</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface DashboardProps {
  statistics: DashboardStatistics;
}

export function Dashboard({ statistics }: DashboardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const stats = [
    {
      title: 'Total de Pedidos',
      value: statistics.totalOrders,
      icon: <ShoppingCart className="text-blue-400" size={28} />,
      gradient: 'from-blue-400 to-blue-600',
      bgGradient: 'from-blue-500 to-blue-600',
      trend: 12,
    },
    {
      title: 'Receita Total',
      value: formatCurrency(statistics.totalRevenue),
      icon: <DollarSign className="text-emerald-400" size={28} />,
      gradient: 'from-emerald-400 to-emerald-600',
      bgGradient: 'from-emerald-500 to-emerald-600',
      trend: 8,
    },
    {
      title: 'Pedidos Pendentes',
      value: statistics.pendingOrders,
      icon: <Clock className="text-orange-400" size={28} />,
      gradient: 'from-orange-400 to-orange-600',
      bgGradient: 'from-orange-500 to-orange-600',
      trend: -3,
    },
    {
      title: 'Pedidos Completos',
      value: statistics.completedOrders,
      icon: <CheckCircle className="text-purple-400" size={28} />,
      gradient: 'from-purple-400 to-purple-600',
      bgGradient: 'from-purple-500 to-purple-600',
      trend: 15,
    },
    {
      title: 'Valor Médio',
      value: formatCurrency(statistics.averageOrderValue),
      icon: <TrendingUp className="text-pink-400" size={28} />,
      gradient: 'from-pink-400 to-pink-600',
      bgGradient: 'from-pink-500 to-pink-600',
      trend: 5,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-4xl font-bold gradient-text mb-2">Dashboard</h2>
        <p className="text-slate-400">Bem-vindo de volta! Aqui está o resumo do seu e-commerce.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat, idx) => (
          <StatCard key={idx} {...stat} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* Recent Orders */}
        <div className="lg:col-span-2 glass rounded-2xl p-6 border border-slate-600 hover:border-slate-500 transition-all">
          <h3 className="text-xl font-bold text-white mb-6">Pedidos Recentes</h3>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 rounded-xl bg-slate-700/30 hover:bg-slate-700/50 transition-all group cursor-pointer"
              >
                <div>
                  <p className="font-semibold text-slate-100 group-hover:text-white transition-colors">
                    Pedido #{String(1000 + i).padStart(4, '0')}
                  </p>
                  <p className="text-sm text-slate-400">há {i + 1} {i === 0 ? 'minuto' : 'minutos'}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-emerald-400 font-bold">+R$ {(100 * (i + 1)).toFixed(2)}</span>
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Status */}
        <div className="glass rounded-2xl p-6 border border-slate-600 hover:border-slate-500 transition-all">
          <h3 className="text-xl font-bold text-white mb-6">Status dos Pedidos</h3>
          <div className="space-y-5">
            {[
              { label: 'Completos', value: statistics.completedOrders, max: statistics.totalOrders, color: 'bg-emerald-500' },
              { label: 'Pendentes', value: statistics.pendingOrders, max: statistics.totalOrders, color: 'bg-orange-500' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-slate-300">{item.label}</span>
                  <span className="text-sm font-bold text-slate-100">{item.value}</span>
                </div>
                <div className="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden">
                  <div
                    className={`${item.color} h-3 rounded-full transition-all duration-500`}
                    style={{
                      width: `${(item.value / item.max) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Stats Summary */}
          <div className="mt-6 pt-6 border-t border-slate-600">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400 text-sm">Taxa de Conclusão</span>
                <span className="font-bold text-emerald-400">
                  {((statistics.completedOrders / statistics.totalOrders) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 text-sm">Valor Médio</span>
                <span className="font-bold text-blue-400">
                  R$ {statistics.averageOrderValue.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
