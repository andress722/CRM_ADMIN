'use client';

import { useApiQuery, useApiMutation, useApiUpload } from '@/hooks/useApi';
import { useToast } from '@/contexts/ToastContext';
import { API_BASE, endpoints, getApiUrl } from '@/services/endpoints';
import { Product, PaginatedResponse } from '@/types/api';
import { ProductModal } from '@/components/ProductModal';
import { Plus, Edit2, Trash2, Search, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '@/services/api-client';

interface ProductsFilters {
  page: number;
  pageSize: number;
}

type ProductFormData = Partial<Product> & { imageFile?: File | null };

interface ProductValidationResult {
  valid: boolean;
  message?: string;
  payload?: ProductFormData;
}

const SKU_PATTERN = /^[a-zA-Z0-9_-]{3,50}$/;

function resolveMediaUrl(url?: string | null): string {
  const value = String(url || "").trim();
  if (!value) return "";
  if (value.startsWith("data:") || value.startsWith("blob:")) return value;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("/")) return `${API_BASE}${value}`;
  return `${API_BASE}/${value}`;
}


function extractErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const e = error as {
    response?: { data?: { message?: string } };
    message?: string;
  };

  if (e.response?.data?.message) {
    return e.response.data.message;
  }

  if (e.message) {
    return e.message;
  }

  return fallback;
}

function validateProductInput(data: ProductFormData): ProductValidationResult {
  const name = (data.name ?? '').trim();
  const description = (data.description ?? '').trim();
  const category = (data.category ?? '').trim();
  const sku = (data.sku ?? '').trim();
  const price = Number(data.price);
  const stock = Number(data.stock);

  if (name.length < 3 || name.length > 120) {
    return { valid: false, message: 'Nome do produto deve ter entre 3 e 120 caracteres.' };
  }

  if (description.length > 2000) {
    return { valid: false, message: 'Descricao excede o limite de 2000 caracteres.' };
  }

  if (category.length < 2 || category.length > 60) {
    return { valid: false, message: 'Categoria deve ter entre 2 e 60 caracteres.' };
  }

  if (!SKU_PATTERN.test(sku)) {
    return { valid: false, message: 'SKU invalido. Use 3-50 caracteres alfanumericos, "_" ou "-".' };
  }

  if (!Number.isFinite(price) || price <= 0) {
    return { valid: false, message: 'Preco deve ser maior que zero.' };
  }

  if (!Number.isInteger(stock) || stock < 0) {
    return { valid: false, message: 'Estoque deve ser um inteiro maior ou igual a zero.' };
  }

  return {
    valid: true,
    payload: {
      ...data,
      name,
      description,
      category,
      sku,
      price,
      stock,
    },
  };
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
  const [productImageMap, setProductImageMap] = useState<Record<string, string>>({});

  const url = getApiUrl(endpoints.admin.products, {
    page: filters.page,
    pageSize: filters.pageSize,
  });

  const { data: productsData, isLoading, error } = useApiQuery<PaginatedResponse<Product>>(
    ['products', filters.page, filters.pageSize],
    url
  );

  const createProductMutation = useApiMutation<{ id: string }, ProductFormData>('post');
  const updateProductMutation = useApiMutation('put');
  const deleteProductMutation = useApiMutation('delete');
  const featureProductMutation = useApiMutation('patch');
  const addImageMutation = useApiUpload<{ success: boolean; imageUrl?: string }>();

  const handleCreateProduct = async (data: ProductFormData) => {
    const validation = validateProductInput(data);
    if (!validation.valid || !validation.payload) {
      addToast(`❌ ${validation.message ?? 'Dados invalidos.'}`, 'error');
      return;
    }

    try {
      const created = await createProductMutation.mutateAsync({
        url: endpoints.admin.products,
        data: validation.payload,
      });

      if (data.imageFile && created?.id) {
        const formData = new FormData();
        formData.append('file', data.imageFile);
        await addImageMutation.mutateAsync({
          url: endpoints.admin.productImages(created.id),
          formData,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowCreateModal(false);
      addToast('✅ Product created successfully!', 'success');
    } catch (err) {
      addToast(`❌ ${extractErrorMessage(err, 'Failed to create product')}`, 'error');
    }
  };

  const handleUpdateProduct = async (data: ProductFormData) => {
    if (!editingProduct) return;

    const validation = validateProductInput(data);
    if (!validation.valid || !validation.payload) {
      addToast(`❌ ${validation.message ?? 'Dados invalidos.'}`, 'error');
      return;
    }

    try {
      await updateProductMutation.mutateAsync({
        url: `${endpoints.admin.products}/${editingProduct.id}`,
        data: validation.payload,
      });

      if (data.imageFile) {
        const formData = new FormData();
        formData.append('file', data.imageFile);
        await addImageMutation.mutateAsync({
          url: endpoints.admin.productImages(editingProduct.id),
          formData,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['products'] });
      setEditingProduct(null);
      addToast('✅ Product updated successfully!', 'success');
    } catch (err) {
      addToast(`❌ ${extractErrorMessage(err, 'Failed to update product')}`, 'error');
    }
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (!confirm(`Delete product "${productName}"? This action cannot be undone.`)) return;
    try {
      await deleteProductMutation.mutateAsync({
        url: `${endpoints.admin.products}/${productId}`,
      });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      addToast('✅ Product deleted successfully!', 'success');
    } catch (err) {
      addToast(`❌ ${extractErrorMessage(err, 'Failed to delete product')}`, 'error');
    }
  };

  const handleToggleFeatured = async (product: Product) => {
    try {
      await featureProductMutation.mutateAsync({
        url: endpoints.admin.productFeatured(product.id),
        data: { isFeatured: !product.isFeatured },
      });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      addToast('✅ Product highlight updated!', 'success');
    } catch (err) {
      addToast(`❌ ${extractErrorMessage(err, 'Failed to update highlight')}`, 'error');
    }
  };

  useEffect(() => {
    const productsForImages = productsData?.data ?? [];
    if (productsForImages.length === 0) {
      setProductImageMap({});
      return;
    }

    let cancelled = false;
    const loadImages = async () => {
      const entries = await Promise.all(
        productsForImages.map(async (product) => {
          try {
            const images = await ApiClient.get<string[]>(endpoints.admin.productImages(product.id));
            return [product.id, resolveMediaUrl(images?.[0] ?? product.imageUrl ?? '')] as const;
          } catch {
            return [product.id, resolveMediaUrl(product.imageUrl ?? '')] as const;
          }
        }),
      );

      if (!cancelled) {
        setProductImageMap(Object.fromEntries(entries));
      }
    };

    void loadImages();
    return () => {
      cancelled = true;
    };
  }, [productsData?.data]);

  const products = productsData?.data || [];
  const totalPages = productsData?.pagination?.totalPages || 1;

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
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

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-slate-800 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
          <p className="text-red-400">Failed to load products</p>
        </div>
      )}

      {!isLoading && !error && (
        <div className="border border-slate-700 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-800">
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Image</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">SKU</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Price</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Stock</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Category</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Views</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Featured</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-slate-400">
                    No products found
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="border-t border-slate-700 hover:bg-slate-800/50">
                    <td className="px-6 py-4">
                      {productImageMap[product.id] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={productImageMap[product.id]} alt={product.name} className="w-10 h-10 rounded object-cover border border-slate-700" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 text-xs">IMG</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-white">{product.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-400">{product.sku}</td>
                    <td className="px-6 py-4 text-sm text-white">${product.price?.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          product.stock > 10
                            ? 'bg-green-900/30 text-green-400'
                            : product.stock > 0
                            ? 'bg-yellow-900/30 text-yellow-400'
                            : 'bg-red-900/30 text-red-400'
                        }`}
                      >
                        {product.stock} units
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">{product.category}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">{product.viewCount || 0}</td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        type="button"
                        onClick={() => handleToggleFeatured(product)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                          product.isFeatured
                            ? 'bg-yellow-900/30 text-yellow-300 hover:bg-yellow-900/50'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        <Star className="w-3 h-3" />
                        {product.isFeatured ? 'Featured' : 'Set featured'}
                      </button>
                    </td>
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
                          onClick={() => handleDeleteProduct(product.id, product.name)}
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
          updateProductMutation.isPending ||
          featureProductMutation.isPending
        }
      />
    </div>
  );
}


