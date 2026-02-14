// app/admin/customers/page.tsx

'use client';

import { useApiQuery } from '@/hooks/useApi';
import { endpoints, getApiUrl } from '@/services/endpoints';
import { Customer, PaginatedResponse } from '@/types/api';
import { Mail, Phone, Eye, MoreVertical } from 'lucide-react';
import { useState } from 'react';

interface CustomersFilters {
  page: number;
  pageSize: number;
}

export default function CustomersPage() {
  const [filters, setFilters] = useState<CustomersFilters>({
    page: 1,
    pageSize: 20,
  });

  const url = getApiUrl(endpoints.admin.customers, {
    page: filters.page,
    pageSize: filters.pageSize,
  });

  const { data: customersData, isLoading, error } = useApiQuery<PaginatedResponse<Customer>>(
    ['customers', filters.page, filters.pageSize],
    url
  );

  const customers = customersData?.data || [];
  const totalPages = customersData?.pagination?.totalPages || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Customers</h1>
        <p className="text-slate-400">Manage and view customer information</p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-16 bg-gradient-to-r from-slate-800 to-slate-700 rounded-lg animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
          <p className="text-red-400">Failed to load customers</p>
        </div>
      )}

      {/* Customers Table */}
      {!isLoading && !error && (
        <div className="rounded-lg border border-white/10 bg-slate-800/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-slate-700/50">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">
                    Orders
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">
                    Total Spent
                  </th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-slate-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                      No customers found
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr key={customer.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-white">
                        {customer.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-500" />
                        {customer.email}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300 flex items-center gap-2">
                        <Phone className="w-4 h-4 text-slate-500" />
                        {customer.phone || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {customer.totalOrders || 0}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-white">
                        ${customer.totalSpent?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && !error && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() =>
              setFilters((f) => ({ ...f, page: Math.max(1, f.page - 1) }))
            }
            disabled={filters.page === 1}
            className="px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-slate-200 hover:border-blue-500 disabled:opacity-50 transition-colors"
          >
            Previous
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setFilters((f) => ({ ...f, page }))}
              className={`px-3 py-2 rounded-lg transition-colors ${
                filters.page === page
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-800 border border-white/10 text-slate-200 hover:border-blue-500'
              }`}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() =>
              setFilters((f) => ({ ...f, page: Math.min(totalPages, f.page + 1) }))
            }
            disabled={filters.page === totalPages}
            className="px-3 py-2 rounded-lg bg-slate-800 border border-white/10 text-slate-200 hover:border-blue-500 disabled:opacity-50 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
