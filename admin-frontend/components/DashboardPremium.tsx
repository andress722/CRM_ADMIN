'use client';

import React from 'react';
import { DashboardStatistics } from '@/lib/types';
import { TrendingUp, TrendingDown, Users, ShoppingCart, DollarSign, Package, BarChart3, type LucideIcon } from 'lucide-react';

interface DashboardPremiumProps {
  statistics: DashboardStatistics;
}

type StatCardProps = {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend: number;
  trendDirection?: 'up' | 'down';
  gradient: string;
};

function StatCard({ icon: Icon, label, value, trend, trendDirection = 'up', gradient }: StatCardProps) {
  const isPositive = trendDirection === 'up';
  return (
    <div className="glass rounded-2xl border border-slate-600 p-6 hover:border-slate-500 transition-all hover:shadow-lg hover:shadow-blue-500/20">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} bg-opacity-20`}>
          <Icon className={`w-6 h-6 bg-gradient-to-r ${gradient} bg-clip-text text-transparent`} />
        </div>
        <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-semibold ${isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
          {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          <span>{trend}%</span>
        </div>
      </div>
      <p className="text-slate-400 text-sm font-medium mb-1">{label}</p>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

export function DashboardPremium({ statistics }: DashboardPremiumProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="space-y-8">
      {/* Header com Boas-vindas */}
      <div className="space-y-2">
        <h1 className="text-5xl font-bold gradient-text">Dashboard</h1>
        <p className="text-slate-400 text-lg">Acompanhe o desempenho da sua loja em tempo real</p>
      </div>

      {/* KPIs Grid - Estilo Cyfe */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={DollarSign}
          label="FATURAMENTO"
          value={formatCurrency(statistics.totalRevenue || 0)}
          trend={12}
          trendDirection="up"
          gradient="from-emerald-500 to-emerald-600"
        />
        <StatCard
          icon={ShoppingCart}
          label="TOTAL DE PEDIDOS"
          value={statistics.totalOrders || 0}
          trend={8}
          trendDirection="up"
          gradient="from-blue-500 to-blue-600"
        />
        <StatCard
          icon={Package}
          label="PENDENTES"
          value={statistics.pendingOrders || 0}
          trend={-3}
          trendDirection="down"
          gradient="from-orange-500 to-orange-600"
        />
        <StatCard
          icon={Users}
          label="COMPLETOS"
          value={statistics.completedOrders || 0}
          trend={15}
          trendDirection="up"
          gradient="from-purple-500 to-purple-600"
        />
      </div>

      {/* Distribuição de Pedidos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass rounded-2xl border border-slate-600 p-8 col-span-1 lg:col-span-2">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <BarChart3 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Status dos Pedidos</h3>
              <p className="text-slate-400 text-sm">Distribuição atual</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Pending */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-300 font-medium">⏱️ Pendentes</span>
                <span className="text-yellow-400 font-bold">12</span>
              </div>
              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full" style={{ width: '35%' }}></div>
              </div>
            </div>

            {/* Processing */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-300 font-medium">⚙️ Processando</span>
                <span className="text-blue-400 font-bold">18</span>
              </div>
              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full" style={{ width: '52%' }}></div>
              </div>
            </div>

            {/* Shipped */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-300 font-medium">📦 Enviados</span>
                <span className="text-purple-400 font-bold">8</span>
              </div>
              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full" style={{ width: '23%' }}></div>
              </div>
            </div>

            {/* Delivered */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-300 font-medium">✅ Entregues</span>
                <span className="text-emerald-400 font-bold">147</span>
              </div>
              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full" style={{ width: '90%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue YTD */}
        <div className="glass rounded-2xl border border-slate-600 p-8">
          <div className="text-center space-y-4">
            <div>
              <p className="text-slate-400 text-sm mb-2">FATURAMENTO YTD</p>
              <p className="text-4xl font-bold gradient-text">
                {formatCurrency(statistics.totalRevenue || 0)}
              </p>
            </div>

            {/* Visualização estilizada */}
            <div className="flex justify-center my-6">
              <div className="relative w-48 h-32 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-emerald-400 text-2xl font-bold">+12%</p>
                  <p className="text-slate-400 text-xs">vs mês anterior</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-slate-600">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Meta mensal</span>
                <span className="text-emerald-400 font-semibold">85%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full" style={{ width: '85%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Produtos Top e Categorias */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Produtos */}
        <div className="glass rounded-2xl border border-slate-600 p-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 rounded-lg bg-orange-500/20">
              <Package className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Top Produtos</h3>
              <p className="text-slate-400 text-sm">Mais vendidos</p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { name: 'Notebook Dell', sales: 142, trend: '+18%' },
              { name: 'Fone Bluetooth', sales: 89, trend: '+12%' },
              { name: 'Webcam HD', sales: 67, trend: '+5%' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-all">
                <div className="flex-1">
                  <p className="text-slate-200 font-medium text-sm">{item.name}</p>
                  <p className="text-slate-500 text-xs">{item.sales} vendas</p>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded ${item.trend.includes('+') ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                  {item.trend}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Categorias Top */}
        <div className="glass rounded-2xl border border-slate-600 p-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 rounded-lg bg-pink-500/20">
              <BarChart3 className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Top Categorias</h3>
              <p className="text-slate-400 text-sm">Maiores receitas</p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { name: 'Eletrônicos', percent: 45, color: 'from-blue-500 to-blue-600' },
              { name: 'Roupas', percent: 28, color: 'from-emerald-500 to-emerald-600' },
              { name: 'Livros', percent: 17, color: 'from-orange-500 to-orange-600' },
              { name: 'Outros', percent: 10, color: 'from-purple-500 to-purple-600' },
            ].map((item, idx) => (
              <div key={idx}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-300 text-sm font-medium">{item.name}</span>
                  <span className="text-slate-400 text-sm">{item.percent}%</span>
                </div>
                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div className={`h-full bg-gradient-to-r ${item.color} rounded-full`} style={{ width: `${item.percent}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Section */}
      <div className="glass rounded-2xl border border-slate-600 p-8">
        <h3 className="text-xl font-bold text-white mb-6">Atividade Recente</h3>
        
        <div className="space-y-3">
          {[
            { time: 'Há 2 minutos', action: 'Novo pedido criado', value: 'Pedido #12345', type: 'order' },
            { time: 'Há 15 minutos', action: 'Produto adicionado', value: 'Notebook XPS 15', type: 'product' },
            { time: 'Há 1 hora', action: 'Novo usuário registrado', value: 'João Silva', type: 'user' },
            { time: 'Há 2 horas', action: 'Pagamento confirmado', value: 'R$ 2.450,00', type: 'payment' },
          ].map((activity, idx) => (
            <div key={idx} className="flex items-center space-x-4 p-4 bg-slate-700/20 rounded-lg hover:bg-slate-700/30 transition-all">
              <div className={`p-2 rounded-lg ${activity.type === 'order' ? 'bg-blue-500/20' : activity.type === 'product' ? 'bg-orange-500/20' : activity.type === 'user' ? 'bg-purple-500/20' : 'bg-emerald-500/20'}`}>
                <ShoppingCart className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-200 font-medium text-sm">{activity.action}</p>
                <p className="text-slate-500 text-xs">{activity.time}</p>
              </div>
              <p className="text-slate-300 font-semibold text-sm truncate">{activity.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
