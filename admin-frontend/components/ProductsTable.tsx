'use client';

import React, { useState } from 'react';
import { Product } from '@/lib/types';
import { Edit2, Trash2, Plus, Search } from 'lucide-react';

interface ProductsTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

export function ProductsTable({ products, onEdit, onDelete, onAdd }: ProductsTableProps) {
  const [filter, setFilter] = useState('');

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(filter.toLowerCase()) ||
      p.category.toLowerCase().includes(filter.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStockColor = (stock: number) => {
    if (stock > 10) return 'from-emerald-500 to-emerald-600';
    if (stock > 0) return 'from-yellow-500 to-yellow-600';
    return 'from-red-500 to-red-600';
  };

  const getStockLabel = (stock: number) => {
    if (stock > 10) return 'Abundante';
    if (stock > 0) return 'Baixo';
    return 'Fora';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-4xl font-bold gradient-text mb-2">Produtos</h2>
          <p className="text-slate-400">Gerenciar catálogo de produtos</p>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/50 transition-all hover:scale-105 font-medium"
        >
          <Plus size={20} />
          <span>Novo Produto</span>
        </button>
      </div>

      <div className="glass rounded-2xl p-6 border border-slate-600">
        <div className="flex items-center space-x-3 bg-slate-700/30 px-4 py-3 rounded-xl border border-slate-600">
          <Search size={20} className="text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou categoria..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1 bg-transparent outline-none text-slate-200 placeholder-slate-500"
          />
        </div>
      </div>

      <div className="glass rounded-2xl border border-slate-600 overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-400 text-lg">Nenhum produto encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-600 bg-slate-700/20">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Nome</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Categoria</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Preço</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Estoque</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">SKU</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-600">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-700/20 transition-colors group">
                    <td className="px-6 py-4 text-sm font-medium text-slate-200 group-hover:text-white">
                      {product.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      <span className="px-3 py-1 rounded-full bg-slate-700/50 text-slate-300">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-emerald-400">
                      {formatCurrency(product.price)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${getStockColor(
                          product.stock
                        )}`}
                      >
                        {product.stock} · {getStockLabel(product.stock)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400 font-mono">{product.sku}</td>
                    <td className="px-6 py-4 text-sm space-x-2">
                      <button
                        onClick={() => onEdit(product)}
                        className="inline-flex items-center space-x-1 px-3 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg transition-all hover:scale-105"
                      >
                        <Edit2 size={16} />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => onDelete(product.id)}
                        className="inline-flex items-center space-x-1 px-3 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-all hover:scale-105"
                      >
                        <Trash2 size={16} />
                        <span>Deletar</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
