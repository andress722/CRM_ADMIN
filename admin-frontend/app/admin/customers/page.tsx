'use client';

import { useApiQuery } from '@/hooks/useApi';
import { endpoints, getApiUrl } from '@/services/endpoints';
import {
  Customer,
  PaginatedResponse,
  CustomerViewedItem,
  CustomerFavoritedItem,
  CustomerSuggestedItem,
} from '@/types/api';
import { Mail, Phone, Eye, X } from 'lucide-react';
import { useState } from 'react';

interface CustomersFilters {
  page: number;
  pageSize: number;
}

export default function CustomersPage() {
  const [filters, setFilters] = useState<CustomersFilters>({ page: 1, pageSize: 20 });
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const url = getApiUrl(endpoints.admin.customers, {
    page: filters.page,
    pageSize: filters.pageSize,
  });

  const { data: customersData, isLoading, error } = useApiQuery<PaginatedResponse<Customer>>(
    ['customers', filters.page, filters.pageSize],
    url
  );

  const viewedUrl = selectedCustomer
    ? getApiUrl(endpoints.admin.customerViewedItems(selectedCustomer.id), { take: 10 })
    : '';
  const favoritedUrl = selectedCustomer
    ? getApiUrl(endpoints.admin.customerFavoritedItems(selectedCustomer.id), { take: 10 })
    : '';
  const suggestedUrl = selectedCustomer
    ? getApiUrl(endpoints.admin.customerSuggestedItems(selectedCustomer.id), { take: 8 })
    : '';

  const viewedQuery = useApiQuery<CustomerViewedItem[]>(
    ['customer-viewed', selectedCustomer?.id],
    viewedUrl,
    { enabled: !!selectedCustomer }
  );

  const favoritedQuery = useApiQuery<CustomerFavoritedItem[]>(
    ['customer-favorited', selectedCustomer?.id],
    favoritedUrl,
    { enabled: !!selectedCustomer }
  );

  const suggestedQuery = useApiQuery<CustomerSuggestedItem[]>(
    ['customer-suggested', selectedCustomer?.id],
    suggestedUrl,
    { enabled: !!selectedCustomer }
  );

  const customers = customersData?.data || [];
  const totalPages = customersData?.pagination?.totalPages || 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Customers</h1>
        <p className="text-slate-400">Manage and view customer information</p>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-gradient-to-r from-slate-800 to-slate-700 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
          <p className="text-red-400">Failed to load customers</p>
        </div>
      )}

      {!isLoading && !error && (
        <div className="rounded-lg border border-white/10 bg-slate-800/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-slate-700/50">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Phone</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Orders</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Total Spent</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">No customers found</td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr key={customer.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-white">{customer.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-300 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-500" />
                        {customer.email}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300 flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-500" />
                        {customer.phone || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">{customer.totalOrders || 0}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-white">${customer.totalSpent?.toFixed(2) || '0.00'}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedCustomer(customer)}
                          className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!isLoading && !error && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, f.page - 1) }))}
            disabled={filters.page === 1}
            className="px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-slate-200 hover:border-blue-500 disabled:opacity-50"
          >
            Previous
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setFilters((f) => ({ ...f, page }))}
              className={`px-3 py-2 rounded-lg ${
                filters.page === page
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-800 border border-white/10 text-slate-200 hover:border-blue-500'
              }`}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => setFilters((f) => ({ ...f, page: Math.min(totalPages, f.page + 1) }))}
            disabled={filters.page === totalPages}
            className="px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-slate-200 hover:border-blue-500 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-xl p-5 space-y-4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Comportamento do Cliente</h2>
                <p className="text-slate-400 text-sm">{selectedCustomer.name} • {selectedCustomer.email}</p>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <section className="bg-slate-800/60 border border-slate-700 rounded-lg p-3">
                <h3 className="text-sm font-semibold text-white mb-2">Itens vistos</h3>
                {viewedQuery.isLoading && <p className="text-xs text-slate-400">Carregando...</p>}
                {!viewedQuery.isLoading && (viewedQuery.data || []).length === 0 && (
                  <p className="text-xs text-slate-400">Sem visualizações.</p>
                )}
                <ul className="space-y-2 text-xs">
                  {(viewedQuery.data || []).map((item) => (
                    <li key={item.productId} className="text-slate-300">
                      <div className="font-medium text-white">{item.productName}</div>
                      <div>{item.category} • {item.views} views</div>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="bg-slate-800/60 border border-slate-700 rounded-lg p-3">
                <h3 className="text-sm font-semibold text-white mb-2">Favoritos</h3>
                {favoritedQuery.isLoading && <p className="text-xs text-slate-400">Carregando...</p>}
                {!favoritedQuery.isLoading && (favoritedQuery.data || []).length === 0 && (
                  <p className="text-xs text-slate-400">Sem favoritos.</p>
                )}
                <ul className="space-y-2 text-xs">
                  {(favoritedQuery.data || []).map((item) => (
                    <li key={`${item.productId}-${item.favoritedAt}`} className="text-slate-300">
                      <div className="font-medium text-white">{item.productName}</div>
                      <div>{item.category}</div>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="bg-slate-800/60 border border-slate-700 rounded-lg p-3">
                <h3 className="text-sm font-semibold text-white mb-2">Sugestões</h3>
                {suggestedQuery.isLoading && <p className="text-xs text-slate-400">Carregando...</p>}
                {!suggestedQuery.isLoading && (suggestedQuery.data || []).length === 0 && (
                  <p className="text-xs text-slate-400">Sem sugestões.</p>
                )}
                <ul className="space-y-2 text-xs">
                  {(suggestedQuery.data || []).map((item) => (
                    <li key={item.id} className="text-slate-300">
                      <div className="font-medium text-white">{item.name}</div>
                      <div>{item.category} • ${item.price?.toFixed(2)}</div>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
