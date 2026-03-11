'use client';

import { useApiQuery } from '@/hooks/useApi';
import { endpoints, getApiUrl } from '@/services/endpoints';
import { Order, PaginatedResponse } from '@/types/api';
import { Clock, AlertCircle, Truck, CheckCircle, XCircle, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { OrderDetailsModal } from '@/components/OrderDetailsModal';

interface OrdersFilters {
  page: number;
  pageSize: number;
  status?: Order['status'];
}

type OrderStatusConfig = {
  value: Order['status'];
  label: string;
  icon: LucideIcon;
  activeFilterClass: string;
  badgeClass: string;
};

const ORDER_STATUSES: OrderStatusConfig[] = [
  {
    value: 'Pending',
    label: 'Pending',
    icon: Clock,
    activeFilterClass: 'bg-yellow-600 text-white',
    badgeClass: 'text-yellow-400',
  },
  {
    value: 'Processing',
    label: 'Processing',
    icon: AlertCircle,
    activeFilterClass: 'bg-blue-600 text-white',
    badgeClass: 'text-blue-400',
  },
  {
    value: 'Shipped',
    label: 'Shipped',
    icon: Truck,
    activeFilterClass: 'bg-cyan-600 text-white',
    badgeClass: 'text-cyan-400',
  },
  {
    value: 'Delivered',
    label: 'Delivered',
    icon: CheckCircle,
    activeFilterClass: 'bg-green-600 text-white',
    badgeClass: 'text-green-400',
  },
  {
    value: 'Cancelled',
    label: 'Cancelled',
    icon: XCircle,
    activeFilterClass: 'bg-red-600 text-white',
    badgeClass: 'text-red-400',
  },
];

export default function OrdersPage() {
  const [filters, setFilters] = useState<OrdersFilters>({
    page: 1,
    pageSize: 20,
  });
  const [selectedStatus, setSelectedStatus] = useState<Order['status'] | undefined>();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const url = getApiUrl(endpoints.admin.orders, {
    page: filters.page,
    pageSize: filters.pageSize,
    ...(selectedStatus && { status: selectedStatus }),
  });

  const { data: ordersData, isLoading, error } = useApiQuery<PaginatedResponse<Order>>(
    ['orders', filters.page, filters.pageSize, selectedStatus],
    url
  );

  const openOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const orders = ordersData?.data || [];
  const totalPages = ordersData?.pagination?.totalPages || 1;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Orders</h1>
          <p className="text-slate-400 mt-1">Manage and track all customer orders</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedStatus(undefined)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            !selectedStatus
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          All Orders
        </button>
        {ORDER_STATUSES.map((status) => (
          <button
            key={status.value}
            onClick={() => setSelectedStatus(status.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedStatus === status.value
                ? status.activeFilterClass
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <status.icon className="w-4 h-4" />
            {status.label}
          </button>
        ))}
      </div>

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

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
          <p className="text-red-400">Failed to load orders</p>
        </div>
      )}

      {!isLoading && !error && (
        <div className="border border-slate-700 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-800">
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Order ID</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Amount</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Items</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    No orders found
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const statusConfig = ORDER_STATUSES.find(
                    (s) => s.value === order.status
                  );
                  const StatusIcon = statusConfig?.icon || AlertCircle;

                  return (
                    <tr
                      key={order.id}
                      onClick={() => openOrderDetails(order)}
                      className="border-t border-slate-700 hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-white">
                        #{order.id?.slice(0, 8) || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-white">
                        ${order.totalAmount?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {order.items?.length || 0} items
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className={`flex items-center gap-2 ${statusConfig?.badgeClass || 'text-slate-300'}`}>
                          <StatusIcon className="w-4 h-4" />
                          <span className="font-medium">
                            {statusConfig?.label || order.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleDateString()
                          : 'N/A'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && !error && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() =>
              setFilters((f) => ({ ...f, page: Math.max(1, f.page - 1) }))
            }
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
            onClick={() =>
              setFilters((f) => ({ ...f, page: Math.min(totalPages, f.page + 1) }))
            }
            disabled={filters.page === totalPages}
            className="px-3 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg hover:border-slate-600 disabled:opacity-50 transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedOrder(null);
          }}
        />
      )}
    </div>
  );
}
