'use client';

import React, { useState } from 'react';
import { Product } from '@/lib/types';
import { X, Save } from 'lucide-react';

interface ProductModalProps {
  isOpen?: boolean;
  product?: Product | null;
  onClose: () => void;
  onSubmit: (product: Partial<Product>) => Promise<void>;
  initialData?: Product | null;
  isLoading: boolean;
}

const emptyFormData = {
  name: '',
  description: '',
  price: 0,
  stock: 0,
  category: '',
  sku: '',
};

const buildFormData = (product?: Product | null, initialData?: Product | null) => {
  const data = product || initialData;
  if (!data) {
    return { ...emptyFormData };
  }

  return {
    name: data.name,
    description: data.description,
    price: data.price,
    stock: data.stock,
    category: data.category,
    sku: data.sku,
  };
};

type ProductModalContentProps = Omit<ProductModalProps, 'isOpen'>;

function ProductModalContent({ product, onClose, onSubmit, initialData, isLoading }: ProductModalContentProps) {
  const [formData, setFormData] = useState(() => buildFormData(product, initialData));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'price' || name === 'stock' ? Number(value) : value,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass rounded-2xl border border-slate-600 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-600">
          <h3 className="text-2xl font-bold gradient-text">
            {product ? '✏️ Editar Produto' : '➕ Novo Produto'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-all"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Nome do Produto</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 bg-slate-700/30 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="Ex: Notebook Dell..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Descrição</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-slate-700/30 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
              placeholder="Descrição detalhada do produto..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">💰 Preço</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                className="w-full px-4 py-3 bg-slate-700/30 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">📦 Estoque</label>
              <input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                required
                min="0"
                className="w-full px-4 py-3 bg-slate-700/30 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">🏷️ Categoria</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-slate-700/30 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
              >
                <option value="">Selecione</option>
                <option value="Eletrônicos">Eletrônicos</option>
                <option value="Roupas">Roupas</option>
                <option value="Alimentos">Alimentos</option>
                <option value="Livros">Livros</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">🔖 SKU</label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-slate-700/30 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all"
                placeholder="SKU-001"
              />
            </div>
          </div>

          <div className="flex space-x-3 pt-6 border-t border-slate-600">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-700/50 hover:bg-slate-700 text-slate-200 rounded-lg transition-all font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:shadow-lg hover:shadow-blue-500/50 text-white rounded-lg transition-all font-medium flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Save size={18} />
              <span>{isLoading ? 'Salvando...' : 'Salvar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ProductModal({ isOpen, product, onClose, onSubmit, initialData, isLoading }: ProductModalProps) {
  if (!isOpen) return null;

  const modalKey = product?.id ?? initialData?.id ?? 'new';

  return (
    <ProductModalContent
      key={modalKey}
      product={product}
      onClose={onClose}
      onSubmit={onSubmit}
      initialData={initialData}
      isLoading={isLoading}
    />
  );
}
