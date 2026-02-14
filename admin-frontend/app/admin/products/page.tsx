'use client';

import { useApiQuery, useApiMutation } from '@/hooks/useApi';
import { useToast } from '@/contexts/ToastContext';
import { endpoints, getApiUrl } from '@/services/endpoints';
import { Product, PaginatedResponse } from '@/types/api';
import { ProductModal } from '@/components/ProductModal';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface ProductsFilters {
  page: number;
  pageSize: number;
}

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [filters, setFilters] = useState<ProductsFilters>({
    page: 1,
    pageSize: 20,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const url = getApiUrl(endpoints.admin.products, {
    page: filters.page,
    pageSize: filters.pageSize,
  });

  const { data: productsData, isLoading, error } = useApiQuery<PaginatedResponse<Product>>(
    ['products', filters.page, filters.pageSize],
    url
  );

  const createProductMutation = useApiMutation('post');
  const updateProductMutation = useApiMutation('put');
  const deleteProductMutation = useApiMutation('delete');

  const handleCreateProduct = async (data: Partial<Product>) => {
    try {
      await createProductMutation.mutateAsync({
        url: endpoints.admin.products,
        data,
      });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowCreateModal(false);
      addToast('✅ Product created successfully!', 'success');
    } catch {
      addToast('❌ Failed to create product', 'error');
    }
  };

  const handleUpdateProduct = async (data: Partial<Product>) => {
    if (!editingProduct) return;
    try {
      await updateProductMutation.mutateAsync({
        url: `${endpoints.admin.products}/${editingProduct.id}`,
        data,
      });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setEditingProduct(null);
      addToast('✅ Product updated successfully!', 'success');
    } catch {
      addToast('❌ Failed to update product', 'error');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteProductMutation.mutateAsync({
        url: `${endpoints.admin.products}/${productId}`,
      });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      addToast('✅ Product deleted successfully!', 'success');
    } catch {
      addToast('❌ Failed to delete product', 'error');
    }
  };

  const products = productsData?.data || [];
  const totalPages = productsData?.pagination?.totalPages || 1;

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Products</h1>
          <p className="text-slate-400 mt-1">Manage your product inventory</p>
        </div>
        <button
          onClick={() => {
            setEditingProduct(null);
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Product
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
        <input
          type="text"
          placeholder="Search by name or SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-16 bg-slate-800 rounded-lg animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
          <p className="text-red-400">Failed to load products</p>
        </div>
      )}

      {/* Products Table */}
      {!isLoading && !error && (
        <div className="border border-slate-700 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-800">
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">SKU</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Price</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Stock</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Category</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No products found
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="border-t border-slate-700 hover:bg-slate-800/50">
                    <td className="px-6 py-4 text-sm font-medium text-white">{product.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">{product.sku}</td>
                    <td className="px-6 py-4 text-sm text-white">${product.price?.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        product.stock > 10
                          ? 'bg-green-900/30 text-green-400'
                          : product.stock > 0
                          ? 'bg-yellow-900/30 text-yellow-400'
                          : 'bg-red-900/30 text-red-400'
                      }`}>
                        {product.stock} units
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">{product.category}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingProduct(product);
                            setShowCreateModal(true);
                          }}
                          className="p-1.5 hover:bg-slate-700 text-slate-400 hover:text-white rounded transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="p-1.5 hover:bg-red-900/20 text-slate-400 hover:text-red-400 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
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

      {/* Product Modal */}
      <ProductModal
        isOpen={showCreateModal || !!editingProduct}
        product={editingProduct}
        onClose={() => {
          setShowCreateModal(false);
          setEditingProduct(null);
        }}
        onSubmit={editingProduct ? handleUpdateProduct : handleCreateProduct}
        isLoading={
          createProductMutation.isPending ||
          updateProductMutation.isPending
        }
      />
    </div>
  );
}
