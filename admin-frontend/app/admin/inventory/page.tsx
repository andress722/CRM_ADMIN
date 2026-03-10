// app/admin/inventory/page.tsx

'use client';

import { useApiQuery, useApiMutation } from '@/hooks/useApi';
import { endpoints, getApiUrl } from '@/services/endpoints';
import { Product, PaginatedResponse } from '@/types/api';
import { useToast } from '@/contexts/ToastContext';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Plus, Minus } from 'lucide-react';

interface InventoryFilters {
  page: number;
  pageSize: number;
}

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [filters, setFilters] = useState<InventoryFilters>({
    page: 1,
    pageSize: 20,
  });
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState(1);

  const url = getApiUrl(endpoints.admin.products, {
    page: filters.page,
    pageSize: filters.pageSize,
  });

  const { data: productsData, isLoading, error } = useApiQuery<PaginatedResponse<Product>>(
    ['products', 'inventory', filters.page],
    url
  );

  const updateMutation = useApiMutation('patch');

  const handleAdjustStock = async (productId: string, currentStock: number, delta: number) => {
    const newStock = Math.max(0, currentStock + delta);
    try {
      await updateMutation.mutateAsync({
        url: `${endpoints.admin.products}/${productId}`,
        data: { stock: newStock, isActive: newStock > 0 },
      });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      addToast(`✅ Stock updated to ${newStock} units`, 'success');
      setAdjustingId(null);
    } catch {
      addToast('❌ Failed to update stock', 'error');
    }
  };

  const products = productsData?.data || [];
  const totalPages = productsData?.pagination?.totalPages || 1;

  // Calculate inventory metrics
  const lowStockProducts = products.filter((p) => p.stock < 10).length;
  const outOfStock = products.filter((p) => p.stock === 0).length;
  const totalValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Inventory Management</h1>
        <p className="text-slate-400 mt-1">Manage product stock and inventory levels</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <p className="text-slate-400 text-sm">Total Products</p>
          <p className="text-3xl font-bold text-white mt-2">{productsData?.pagination?.total || 0}</p>
        </div>
        <div className="bg-yellow-900/20 rounded-lg p-4 border border-yellow-500/30">
          <p className="text-yellow-400 text-sm">Low Stock (&lt;10)</p>
          <p className="text-3xl font-bold text-yellow-300 mt-2">{lowStockProducts}</p>
        </div>
        <div className="bg-red-900/20 rounded-lg p-4 border border-red-500/30">
          <p className="text-red-400 text-sm">Out of Stock</p>
          <p className="text-3xl font-bold text-red-300 mt-2">{outOfStock}</p>
        </div>
        <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-500/30">
          <p className="text-blue-400 text-sm">Inventory Value</p>
          <p className="text-3xl font-bold text-blue-300 mt-2">${totalValue.toFixed(0)}</p>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-slate-800 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
          <p className="text-red-400">Failed to load products</p>
        </div>
      )}

      {/* Inventory Table */}
      {!isLoading && !error && (
        <div className="border border-slate-700 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-800">
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Product</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">SKU</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Stock Level</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Price</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Value</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Action</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No products found
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const isLowStock = product.stock < 10;
                  const isOutOfStock = product.stock === 0;
                  const stockColor = isOutOfStock ? 'red' : isLowStock ? 'yellow' : 'green';

                  return (
                    <tr key={product.id} className="border-t border-slate-700 hover:bg-slate-800/50">
                      <td className="px-6 py-4 text-sm font-medium text-white">{product.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-400">{product.sku}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {(isLowStock || isOutOfStock) && (
                            <AlertTriangle className={`w-4 h-4 text-${stockColor}-400`} />
                          )}
                          <span className={`font-semibold text-${stockColor}-400`}>
                            {product.stock} units
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-white font-medium">
                        ${product.price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-blue-400">
                        ${(product.price * product.stock).toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        {adjustingId === product.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                handleAdjustStock(product.id, product.stock, -1)
                              }
                              disabled={adjustAmount < 1}
                              className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200 disabled:opacity-50 transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <input
                              type="number"
                              value={adjustAmount}
                              onChange={(e) => setAdjustAmount(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-12 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-center text-sm"
                              min="1"
                            />
                            <button
                              onClick={() =>
                                handleAdjustStock(product.id, product.stock, 1)
                              }
                              disabled={adjustAmount < 1}
                              className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200 disabled:opacity-50 transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setAdjustingId(null);
                                setAdjustAmount(1);
                              }}
                              className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setAdjustingId(product.id);
                              setAdjustAmount(1);
                            }}
                            className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                          >
                            Adjust
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && !error && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, f.page - 1) }))}
            disabled={filters.page === 1}
            className="px-3 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg hover:border-slate-600 disabled:opacity-50 transition-colors"
          >
            Previous
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => filters.page - 2 + i)
            .filter((p) => p > 0 && p <= totalPages)
            .map((page) => (
              <button
                key={page}
                onClick={() => setFilters((f) => ({ ...f, page }))}
                className={`px-3 py-2 rounded-lg transition-colors ${
                  filters.page === page
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 border border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                {page}
              </button>
            ))}
          <button
            onClick={() => setFilters((f) => ({ ...f, page: Math.min(totalPages, f.page + 1) }))}
            disabled={filters.page === totalPages}
            className="px-3 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg hover:border-slate-600 disabled:opacity-50 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

