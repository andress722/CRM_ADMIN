'use client';

import React from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TopProductStatistic, TopCategoryStatistic } from '@/lib/types';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

interface ChartsProps {
  topProducts: TopProductStatistic[];
  topCategories: TopCategoryStatistic[];
}

export function Charts({ topProducts, topCategories }: ChartsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-4xl font-bold gradient-text mb-6">📊 Análises e Gráficos</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products Chart */}
        <div className="glass rounded-2xl border border-slate-600 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <span className="text-3xl">🏆</span>
            <h3 className="text-xl font-bold text-slate-200">Top 10 Produtos</h3>
          </div>
          {topProducts.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-500">
              <p className="text-center">
                <span className="text-3xl block mb-2">📭</span>
                Sem dados disponíveis
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.3)" />
                <XAxis dataKey="productId" tick={{ fontSize: 12, fill: '#cbd5e1' }} />
                <YAxis tick={{ fontSize: 12, fill: '#cbd5e1' }} />
                <Tooltip
                  formatter={(value) => [value, 'Quantidade']}
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#e2e8f0' }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Bar dataKey="totalQuantitySold" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Categories Chart */}
        <div className="glass rounded-2xl border border-slate-600 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <span className="text-3xl">📂</span>
            <h3 className="text-xl font-bold text-slate-200">Categorias Top</h3>
          </div>
          {topCategories.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-500">
              <p className="text-center">
                <span className="text-3xl block mb-2">📭</span>
                Sem dados disponíveis
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={topCategories}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, totalQuantitySold }) => `${category}: ${totalQuantitySold}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="totalQuantitySold"
                >
                  {topCategories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [value, 'Quantidade']}
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#e2e8f0' }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Revenue Distribution */}
        <div className="lg:col-span-2 glass rounded-2xl border border-slate-600 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <span className="text-3xl">💰</span>
            <h3 className="text-xl font-bold text-slate-200">Distribuição de Receita por Produto</h3>
          </div>
          {topProducts.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-500">
              <p className="text-center">
                <span className="text-3xl block mb-2">📭</span>
                Sem dados disponíveis
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.3)" />
                <XAxis dataKey="productId" tick={{ fontSize: 12, fill: '#cbd5e1' }} />
                <YAxis tick={{ fontSize: 12, fill: '#cbd5e1' }} />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#e2e8f0' }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Bar dataKey="totalRevenue" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
