'use client';

import { useApiQuery, useApiMutation } from '@/hooks/useApi';
import { endpoints } from '@/services/endpoints';
import { Product } from '@/types/api';
import { useToast } from '@/contexts/ToastContext';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Edit2, Trash2, Save } from 'lucide-react';

interface ProductDetailsPageProps {
  params: {
    id: string;
  };
}

export default function ProductDetailsPage({ params }: ProductDetailsPageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Product>>({});
  const { data: product, isLoading } = useApiQuery<Product>(
    ['products', 'details', params.id],
    endpoints.admin.productDetail(params.id)
  );
  const { data: productImages } = useApiQuery<string[]>(
    ['products', 'images', params.id],
    endpoints.admin.productImages(params.id),
    { enabled: !!params.id }
  );

  const updateMutation = useApiMutation('patch');
  const deleteMutation = useApiMutation('delete');
  const addImageMutation = useApiMutation<{ success: boolean }>('post');

  const handleEdit = () => {
    if (product) {
      setEditData(product);
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        url: `${endpoints.admin.products}/${product?.id}`,
        data: editData,
      });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      addToast('✅ Product updated successfully!', 'success');
      setIsEditing(false);
      if (product) {
        setEditData(product);
      }
    } catch {
      addToast('❌ Failed to update product', 'error');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteMutation.mutateAsync({
        url: `${endpoints.admin.products}/${product?.id}`,
      });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      addToast('✅ Product deleted successfully!', 'success');
      router.push('/admin/products');
    } catch {
      addToast('❌ Failed to delete product', 'error');
    }
  };

  const handleAddImage = async () => {
    if (!product?.id) {
      return;
    }

    try {
      await addImageMutation.mutateAsync({
        url: endpoints.admin.productImages(product.id),
      });
      queryClient.invalidateQueries({ queryKey: ['products', 'images', params.id] });
      addToast('✅ Product image added', 'success');
    } catch {
      addToast('❌ Failed to add product image', 'error');
    }
  };

  if (isLoading || !product) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-700 rounded w-1/3 mb-4" />
          <div className="h-96 bg-slate-700 rounded" />
        </div>
      </div>
    );
  }

  const displayData = isEditing ? editData : product;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">Product Details</h1>
            <p className="text-slate-400">Manage product information</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <>
              <button
                onClick={handleEdit}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditData({});
                }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
            <div className="aspect-square rounded-lg bg-slate-900 border border-slate-700 overflow-hidden flex items-center justify-center">
              {(productImages ?? [])[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={(productImages ?? [])[0]}
                  alt={displayData.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center">
                  <div className="text-5xl mb-2">📦</div>
                  <p className="text-slate-500 text-sm">No image yet</p>
                </div>
              )}
            </div>
            <button
              onClick={handleAddImage}
              disabled={addImageMutation.isPending}
              className="w-full mt-3 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm"
            >
              {addImageMutation.isPending ? 'Adding...' : 'Add Image'}
            </button>
          </div>

          <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-4">
            <p className="text-sm font-semibold text-white mb-3">Image URLs</p>
            <div className="space-y-2 max-h-56 overflow-auto pr-1">
              {(productImages ?? []).length === 0 && (
                <p className="text-xs text-slate-500">No uploaded images.</p>
              )}
              {(productImages ?? []).map((image, index) => (
                <div key={image} className="text-xs rounded bg-slate-900 border border-slate-700 p-2 space-y-2">
                  <p className="text-slate-300 break-all">{image}</p>
                  <button
                    onClick={() => navigator.clipboard.writeText(image)}
                    className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-100"
                  >
                    Copy URL #{index + 1}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white mb-4">Basic Information</h2>

            <div>
              <label className="text-sm text-slate-400 mb-2 block">Product Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editData.name || ''}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                />
              ) : (
                <p className="text-white font-medium">{displayData.name}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-400 mb-2 block">SKU</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.sku || ''}
                    onChange={(e) => setEditData({ ...editData, sku: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                  />
                ) : (
                  <p className="text-white font-medium">{displayData.sku}</p>
                )}
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Category</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.category || ''}
                    onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                  />
                ) : (
                  <p className="text-white font-medium">{displayData.category || 'N/A'}</p>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-2 block">Description</label>
              {isEditing ? (
                <textarea
                  value={editData.description || ''}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white h-24"
                />
              ) : (
                <p className="text-slate-300 text-sm">{displayData.description || 'No description'}</p>
              )}
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white mb-4">Pricing & Inventory</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Price</label>
                {isEditing ? (
                  <input
                    type="number"
                    step="0.01"
                    value={editData.price || 0}
                    onChange={(e) => setEditData({ ...editData, price: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                  />
                ) : (
                  <p className="text-white font-bold text-lg">${displayData.price?.toFixed(2)}</p>
                )}
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Stock</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={editData.stock || 0}
                    onChange={(e) => setEditData({ ...editData, stock: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                  />
                ) : (
                  <p className="text-white font-bold text-lg">{displayData.stock} units</p>
                )}
              </div>
            </div>

            {!isEditing && (
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Inventory Value</label>
                <p className="text-blue-400 font-bold text-lg">
                  ${((displayData.price || 0) * (displayData.stock || 0)).toFixed(2)}
                </p>
              </div>
            )}
          </div>

          <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6 space-y-3">
            <h2 className="text-lg font-semibold text-white mb-4">Metadata</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-400">Created</p>
                <p className="text-white font-medium">
                  {new Date(displayData.createdAt || '').toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Last Updated</p>
                <p className="text-white font-medium">
                  {new Date(displayData.updatedAt || '').toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Product ID</p>
                <p className="text-white font-medium text-xs">{displayData.id?.slice(0, 12)}</p>
              </div>
              <div>
                <p className="text-slate-400">Status</p>
                <p className={`font-medium ${displayData.isActive ? 'text-green-400' : 'text-red-400'}`}>
                  {displayData.isActive ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
