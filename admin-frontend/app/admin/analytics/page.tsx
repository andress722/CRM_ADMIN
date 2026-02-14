'use client';

import { useApiQuery } from '@/hooks/useApi';
import { endpoints, getApiUrl } from '@/services/endpoints';
import { Order, Product, PaginatedResponse } from '@/types/api';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { Loader } from 'lucide-react';

export default function AnalyticsPage() {
  // Fetch all orders (without pagination for analytics)
  const { data: ordersData, isLoading: ordersLoading } = useApiQuery<PaginatedResponse<Order>>(
    ['orders', 'all-for-analytics'],
    getApiUrl(endpoints.admin.orders, { page: 1, pageSize: 1000 })
  );

  // Fetch all products (without pagination for analytics)
  const { data: productsData, isLoading: productsLoading } = useApiQuery<PaginatedResponse<Product>>(
    ['products', 'all-for-analytics'],
    getApiUrl(endpoints.admin.products, { page: 1, pageSize: 1000 })
  );

  const isLoading = ordersLoading || productsLoading;
  const orders = ordersData?.data || [];
  const products = productsData?.data || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Analytics & Reports</h1>
        <p className="text-slate-400">Comprehensive insights into your business performance</p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <Loader className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
            <p className="text-slate-400">Loading analytics data...</p>
          </div>
        </div>
      )}

      {/* Analytics Dashboard */}
      {!isLoading && <AnalyticsDashboard orders={orders} products={products} />}
    </div>
  );
}
