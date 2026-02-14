'use client';

import React from 'react';
import { DashboardStatistics } from '@/lib/types';
import { TrendingUp, TrendingDown, ShoppingCart, DollarSign, Package, BarChart3, Zap, Target, type LucideIcon } from 'lucide-react';

interface DashboardProps {
  statistics: DashboardStatistics;
}

type KPICardProps = {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtext?: string;
  trend: number;
  color: string;
  bgColor: string;
};

function KPICard({ icon: Icon, label, value, subtext, trend, color, bgColor }: KPICardProps) {
  return (
    <div className="group relative overflow-hidden rounded-3xl">
      <div className={`absolute inset-0 ${bgColor} opacity-0 group-hover:opacity-30 blur-3xl transition-all duration-500`}></div>

      <div className="relative backdrop-blur-xl bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-slate-700/50 p-8 rounded-3xl hover:border-slate-600/80 transition-all duration-300">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-full -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-500"></div>

        <div className="relative z-10 space-y-6">
          <div className="flex items-start justify-between">
            <div className={`p-4 rounded-2xl ${bgColor} group-hover:scale-110 transition-transform duration-300`}>
              <Icon className="w-7 h-7 text-white" />
            </div>
            <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide backdrop-blur ${trend >= 0 ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50' : 'bg-red-500/30 text-red-300 border border-red-500/50'}`}>
              {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>{Math.abs(trend)}%</span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest opacity-70">{label}</p>
            <p className={`text-5xl font-black bg-gradient-to-r ${color} bg-clip-text text-transparent`}>{value}</p>
            {subtext && <p className="text-slate-500 text-sm">{subtext}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardNEW({ statistics }: DashboardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="relative space-y-6">
        {/* Animated background elements */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

        <div className="relative z-10">
          <h1 className="text-7xl md:text-8xl font-black mb-3">
            <span className="bg-gradient-to-r from-blue-300 via-cyan-300 to-emerald-300 bg-clip-text text-transparent">Dashboard</span>
          </h1>
          <p className="text-slate-300 text-xl font-light tracking-wide">Visualize o desempenho da sua loja em tempo real</p>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          icon={DollarSign}
          label="Faturamento"
          value={formatCurrency(statistics.totalRevenue || 0)}
          subtext="Total acumulado"
          trend={12}
          color="from-emerald-400 to-teal-400"
          bgColor="bg-gradient-to-br from-emerald-500/40 to-teal-500/20"
        />
        <KPICard
          icon={ShoppingCart}
          label="Pedidos"
          value={statistics.totalOrders || 0}
          subtext="Total de transações"
          trend={8}
          color="from-blue-400 to-cyan-400"
          bgColor="bg-gradient-to-br from-blue-500/40 to-cyan-500/20"
        />
        <KPICard
          icon={Package}
          label="Pendentes"
          value={statistics.pendingOrders || 0}
          subtext="Aguardando processamento"
          trend={-3}
          color="from-orange-400 to-amber-400"
          bgColor="bg-gradient-to-br from-orange-500/40 to-amber-500/20"
        />
        <KPICard
          icon={Zap}
          label="Completos"
          value={statistics.completedOrders || 0}
          subtext="Pedidos entregues"
          trend={15}
          color="from-purple-400 to-pink-400"
          bgColor="bg-gradient-to-br from-purple-500/40 to-pink-500/20"
        />
      </div>

      {/* Main Grid - Estatísticas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders Status - Large */}
        <div className="lg:col-span-2 backdrop-blur-xl bg-gradient-to-br from-slate-800/40 to-slate-900/40 rounded-3xl border border-slate-700/50 p-8 hover:border-slate-600/80 transition-all duration-300">
          <div className="flex items-center space-x-3 mb-8">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500/40 to-cyan-500/20">
              <BarChart3 className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">Status dos Pedidos</h3>
              <p className="text-slate-400 text-sm mt-1">Distribuição atual de pedidos</p>
            </div>
          </div>

          <div className="space-y-5">
            {[
              { label: '⏱️  Pendentes', count: 12, percent: 35, color: 'from-yellow-500 to-orange-500' },
              { label: '⚙️  Processando', count: 18, percent: 52, color: 'from-blue-500 to-cyan-500' },
              { label: '📦 Enviados', count: 8, percent: 23, color: 'from-purple-500 to-pink-500' },
              { label: '✅ Entregues', count: 147, percent: 90, color: 'from-emerald-500 to-teal-500' },
            ].map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 font-semibold text-sm">{item.label}</span>
                  <span className={`text-sm font-bold bg-gradient-to-r ${item.color} bg-clip-text text-transparent`}>{item.count}</span>
                </div>
                <div className="relative h-3 bg-slate-700/50 rounded-full overflow-hidden">
                  <div className={`absolute inset-y-0 left-0 bg-gradient-to-r ${item.color} rounded-full transition-all duration-500`} style={{ width: `${item.percent}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ticket Médio - Boxed */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-slate-800/40 to-slate-900/40 rounded-3xl border border-slate-700/50 p-8 hover:border-slate-600/80 transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-pink-500/40 to-rose-500/20">
                <Target className="w-6 h-6 text-pink-300" />
              </div>
              <h3 className="text-xl font-bold text-white">Ticket Médio</h3>
            </div>

            <p className="text-slate-400 text-sm mb-4">Valor médio por pedido</p>
            <p className="text-5xl font-black bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent mb-6">
              {formatCurrency((statistics.totalRevenue || 0) / (statistics.totalOrders || 1))}
            </p>
          </div>

          <div className="space-y-3 pt-6 border-t border-slate-700/50">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Meta mensal</span>
              <span className="text-emerald-400 font-bold">85%</span>
            </div>
            <div className="relative h-2 bg-slate-700/50 rounded-full overflow-hidden">
              <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" style={{ width: '85%' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section - Produtos e Categorias */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-slate-800/40 to-slate-900/40 rounded-3xl border border-slate-700/50 p-8 hover:border-slate-600/80 transition-all duration-300">
          <div className="flex items-center space-x-3 mb-8">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500/40 to-yellow-500/20">
              <Package className="w-6 h-6 text-orange-300" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">Top Produtos</h3>
              <p className="text-slate-400 text-sm mt-1">Mais vendidos</p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { name: '🔴 Notebook Dell XPS', sales: 142, trend: '+18%' },
              { name: '🟢 Fone Bluetooth', sales: 89, trend: '+12%' },
              { name: '🔵 Webcam HD 1080p', sales: 67, trend: '+5%' },
            ].map((item, idx) => (
              <div key={idx} className="group flex items-center justify-between p-4 rounded-2xl bg-slate-700/20 hover:bg-slate-700/40 transition-all duration-300 border border-slate-600/30 hover:border-slate-600/60">
                <div className="flex-1">
                  <p className="text-slate-200 font-semibold text-sm">{item.name}</p>
                  <p className="text-slate-500 text-xs mt-1">{item.sales} vendas</p>
                </div>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${item.trend.includes('+') ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50' : 'bg-red-500/30 text-red-300'}`}>
                  {item.trend}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Categories */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-slate-800/40 to-slate-900/40 rounded-3xl border border-slate-700/50 p-8 hover:border-slate-600/80 transition-all duration-300">
          <div className="flex items-center space-x-3 mb-8">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/40 to-pink-500/20">
              <BarChart3 className="w-6 h-6 text-purple-300" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">Top Categorias</h3>
              <p className="text-slate-400 text-sm mt-1">Maiores receitas</p>
            </div>
          </div>

          <div className="space-y-5">
            {[
              { name: '💻 Eletrônicos', percent: 45, color: 'from-blue-500 to-cyan-500' },
              { name: '👕 Roupas', percent: 28, color: 'from-emerald-500 to-teal-500' },
              { name: '📚 Livros', percent: 17, color: 'from-orange-500 to-amber-500' },
              { name: '🎁 Outros', percent: 10, color: 'from-purple-500 to-pink-500' },
            ].map((item, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 font-semibold text-sm">{item.name}</span>
                  <span className={`text-sm font-bold bg-gradient-to-r ${item.color} bg-clip-text text-transparent`}>{item.percent}%</span>
                </div>
                <div className="relative h-3 bg-slate-700/50 rounded-full overflow-hidden">
                  <div className={`absolute inset-y-0 left-0 bg-gradient-to-r ${item.color} rounded-full transition-all duration-500`} style={{ width: `${item.percent}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="backdrop-blur-xl bg-gradient-to-br from-slate-800/40 to-slate-900/40 rounded-3xl border border-slate-700/50 p-8 hover:border-slate-600/80 transition-all duration-300">
        <h3 className="text-2xl font-bold text-white mb-8">Atividade Recente</h3>

        <div className="space-y-3">
          {[
            { time: 'Há 2 min', action: 'Novo pedido criado', value: 'Pedido #12345', icon: '🛒', color: 'from-blue-500/40 to-cyan-500/20' },
            { time: 'Há 15 min', action: 'Produto adicionado', value: 'Notebook XPS 15', icon: '📦', color: 'from-orange-500/40 to-yellow-500/20' },
            { time: 'Há 1h', action: 'Novo usuário', value: 'João Silva', icon: '👤', color: 'from-purple-500/40 to-pink-500/20' },
            { time: 'Há 2h', action: 'Pagamento confirmado', value: 'R$ 2.450,00', icon: '✅', color: 'from-emerald-500/40 to-teal-500/20' },
          ].map((activity, idx) => (
            <div key={idx} className="group flex items-center space-x-4 p-4 rounded-2xl bg-slate-700/20 hover:bg-slate-700/40 transition-all duration-300 border border-slate-600/30 hover:border-slate-600/60">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${activity.color}`}>
                <span className="text-xl">{activity.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-200 font-semibold text-sm">{activity.action}</p>
                <p className="text-slate-500 text-xs mt-1">{activity.time}</p>
              </div>
              <p className="text-slate-300 font-semibold text-sm truncate whitespace-nowrap">{activity.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
