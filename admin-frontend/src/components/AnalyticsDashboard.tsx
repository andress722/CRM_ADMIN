'use client';

import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Order, Product } from '@/types/api';
import { TrendingUp } from 'lucide-react';

interface AnalyticsDashboardProps {
  orders: Order[];
  products: Product[];
}

export function AnalyticsDashboard({ orders, products }: AnalyticsDashboardProps) {
  // Generate revenue data (last 7 days simulation)
  const generateRevenueData = () => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayOrders = orders.filter(
        (order) =>
          new Date(order.createdAt).toDateString() === date.toDateString() &&
          order.status !== 'Cancelled'
      );
      const revenue = dayOrders.reduce((sum, order) => sum + order.totalAmount, 0);
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: Math.round(revenue * 100) / 100,
      });
    }
    return data;
  };

  // Get top 5 products by sales
  const getTopProducts = () => {
    const productSales: { [key: string]: { name: string; sales: number; revenue: number } } = {};

    orders
      .filter((order) => order.status !== 'Cancelled')
      .forEach((order) => {
        order.items?.forEach((item) => {
          if (!productSales[item.productId]) {
            const product = products.find((p) => p.id === item.productId);
            productSales[item.productId] = {
              name: product?.name || `Product ${item.productId.slice(0, 8)}`,
              sales: 0,
              revenue: 0,
            };
          }
          productSales[item.productId].sales += item.quantity;
          productSales[item.productId].revenue += item.unitPrice * item.quantity;
        });
      });

    return Object.entries(productSales)
      .map(([id, data]) => ({
        id,
        ...data,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  };

  // Get status breakdown
  const getStatusBreakdown = () => {
    const statusCounts: { [key: string]: number } = {
      Pending: 0,
      Processing: 0,
      Shipped: 0,
      Delivered: 0,
      Cancelled: 0,
    };

    orders.forEach((order) => {
      statusCounts[order.status]++;
    });

    return Object.entries(statusCounts)
      .map(([status, count]) => ({
        name: status,
        value: count,
      }))
      .filter((item) => item.value > 0);
  };

  const revenueData = generateRevenueData();
  const topProducts = getTopProducts();
  const statusBreakdown = getStatusBreakdown();

  const COLORS = {
    Pending: '#EAB308',
    Processing: '#3B82F6',
    Shipped: '#06B6D4',
    Delivered: '#10B981',
    Cancelled: '#EF4444',
  };

  // Calculate total revenue
  const totalRevenue = revenueData.reduce((sum, day) => sum + day.revenue, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <TrendingUp className="w-6 h-6 text-blue-400" />
        <h2 className="text-2xl font-bold text-white">Analytics & Insights</h2>
      </div>

      {/* Revenue Summary Card */}
      <div className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 rounded-xl p-6 border border-blue-500/20">
        <p className="text-slate-400 text-sm uppercase tracking-wide mb-2">7-Day Revenue</p>
        <p className="text-4xl font-bold text-blue-300">${totalRevenue.toFixed(2)}</p>
        <p className="text-slate-400 text-sm mt-2">{orders.length} total orders</p>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Over Time */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94A3B8" />
              <YAxis stroke="#94A3B8" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1E293B',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#E2E8F0' }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ fill: '#3B82F6', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Status Breakdown */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Order Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {statusBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1E293B',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#E2E8F0' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 lg:col-span-2">
          <h3 className="text-lg font-semibold text-white mb-4">Top 5 Products by Revenue</h3>
          {topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94A3B8" angle={-45} textAnchor="end" height={100} />
                <YAxis stroke="#94A3B8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#E2E8F0' }}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#3B82F6" name="Revenue ($)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="sales" fill="#10B981" name="Units Sold" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-400 text-center py-8">No product data available</p>
          )}
        </div>

        {/* Order Status Table */}
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 lg:col-span-2">
          <h3 className="text-lg font-semibold text-white mb-4">Order Summary by Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { name: 'Pending', color: 'yellow', icon: '⏳' },
              { name: 'Processing', color: 'blue', icon: '⚙️' },
              { name: 'Shipped', color: 'cyan', icon: '📦' },
              { name: 'Delivered', color: 'green', icon: '✅' },
              { name: 'Cancelled', color: 'red', icon: '❌' },
            ].map((status) => {
              const count = statusBreakdown.find((s) => s.name === status.name)?.value || 0;
              return (
                <div
                  key={status.name}
                  className={`bg-${status.color}-900/20 border border-${status.color}-500/30 rounded-lg p-4 text-center`}
                >
                  <p className="text-2xl mb-2">{status.icon}</p>
                  <p className={`text-2xl font-bold text-${status.color}-300`}>{count}</p>
                  <p className="text-slate-400 text-xs mt-1">{status.name}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
