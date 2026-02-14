# ADMIN PANEL DETAILED SPECIFICATION - SISTEMA E-COMMERCE "Loja de Produtos"

**Foco:** Dashboard, management interfaces, reporting, user management

---

## 1. ADMIN PANEL ARCHITECTURE

```
Admin Panel (Next.js 14)
├── Dashboard (Overview)
├── Orders Management
├── Inventory Management
├── Users & Permissions
├── Products Management
├── Payments & Refunds
├── Customers Management
├── Reports & Analytics
├── Settings
└── Audit Logs
```

---

## 2. ADMIN DASHBOARD (HOME)

```typescript
// src/app/(admin)/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, LineChart, BarChart } from '@/components/ui';
import { api } from '@/lib/api';

interface DashboardData {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  conversionRate: number;
  newCustomers: number;
  activeUsers: number;
  lowStockItems: number;
  failedPayments: number;
  
  revenueChart: { date: string; amount: number }[];
  ordersByStatus: { status: string; count: number }[];
  topProducts: { name: string; sold: number; revenue: number }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d'); // 7d, 30d, 90d, ytd

  useEffect(() => {
    loadDashboardData();
  }, [dateRange]);

  const loadDashboardData = async () => {
    try {
      const response = await api.get('/admin/dashboard', {
        params: { dateRange }
      });
      setData(response.data);
    } catch (err) {
      console.error('Failed to load dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="ytd">Year to date</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <div className="text-gray-600">Total Revenue</div>
          <div className="text-3xl font-bold">R$ {data?.totalRevenue.toLocaleString('pt-BR')}</div>
          <div className="text-sm text-green-600">↑ 12% from last period</div>
        </Card>

        <Card>
          <div className="text-gray-600">Total Orders</div>
          <div className="text-3xl font-bold">{data?.totalOrders}</div>
          <div className="text-sm text-green-600">↑ 8% from last period</div>
        </Card>

        <Card>
          <div className="text-gray-600">Avg Order Value</div>
          <div className="text-3xl font-bold">R$ {data?.avgOrderValue.toLocaleString('pt-BR')}</div>
          <div className="text-sm text-blue-600">→ Same as last period</div>
        </Card>

        <Card>
          <div className="text-gray-600">Conversion Rate</div>
          <div className="text-3xl font-bold">{data?.conversionRate.toFixed(2)}%</div>
          <div className="text-sm text-red-600">↓ 2% from last period</div>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <h2 className="text-xl font-bold mb-4">Revenue Over Time</h2>
        <LineChart
          data={data?.revenueChart || []}
          xKey="date"
          yKey="amount"
          height={300}
        />
      </Card>

      {/* Orders by Status */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <h2 className="text-xl font-bold mb-4">Orders by Status</h2>
          <BarChart
            data={data?.ordersByStatus || []}
            xKey="status"
            yKey="count"
            height={300}
          />
        </Card>

        {/* Alerts & Issues */}
        <Card>
          <h2 className="text-xl font-bold mb-4">Alerts & Issues</h2>
          <div className="space-y-2">
            {data?.lowStockItems! > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                <div className="font-semibold text-yellow-900">⚠️ Low Stock</div>
                <div className="text-sm text-yellow-700">
                  {data?.lowStockItems} products below reorder level
                </div>
                <a href="/admin/inventory" className="text-blue-600 text-sm hover:underline">
                  View inventory
                </a>
              </div>
            )}

            {data?.failedPayments! > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <div className="font-semibold text-red-900">🚨 Failed Payments</div>
                <div className="text-sm text-red-700">
                  {data?.failedPayments} payment failures in last 24h
                </div>
                <a href="/admin/payments" className="text-blue-600 text-sm hover:underline">
                  Review payments
                </a>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Top Products */}
      <Card>
        <h2 className="text-xl font-bold mb-4">Top Selling Products</h2>
        <table className="w-full">
          <thead className="border-b">
            <tr>
              <th className="text-left py-2">Product</th>
              <th className="text-right py-2">Sold</th>
              <th className="text-right py-2">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {data?.topProducts.map(product => (
              <tr key={product.name} className="border-b hover:bg-gray-50">
                <td className="py-2">{product.name}</td>
                <td className="text-right">{product.sold}</td>
                <td className="text-right">R$ {product.revenue.toLocaleString('pt-BR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
```

---

## 3. ORDERS MANAGEMENT

```typescript
// src/app/(admin)/orders/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Table, Badge, Pagination } from '@/components/ui';
import { api } from '@/lib/api';
import OrderDetailModal from '@/components/admin/OrderDetailModal';
import OrderActionsDropdown from '@/components/admin/OrderActionsDropdown';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  total: number;
  status: string;
  paymentStatus: string;
  shippingStatus: string;
  createdAt: string;
  items: any[];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    status: '',
    paymentStatus: '',
    dateFrom: '',
    dateTo: '',
    search: ''
  });

  useEffect(() => {
    loadOrders();
  }, [page, filters]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/orders', {
        params: {
          page,
          pageSize,
          ...filters
        }
      });
      setOrders(response.data.items);
      setTotal(response.data.total);
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    const response = await api.get('/admin/orders/export', {
      params: filters,
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `orders-${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Orders</h1>
        <button
          onClick={handleExport}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded shadow space-y-4">
        <div className="grid grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="border border-gray-300 rounded px-3 py-2"
          />

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Paid">Paid</option>
            <option value="Shipped">Shipped</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <select
            value={filters.paymentStatus}
            onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}
            className="border border-gray-300 rounded px-3 py-2"
          >
            <option value="">All Payment Status</option>
            <option value="Pending">Pending</option>
            <option value="Succeeded">Succeeded</option>
            <option value="Failed">Failed</option>
          </select>

          <button
            onClick={loadOrders}
            className="bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Filter
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="text-left py-3 px-4">Order #</th>
              <th className="text-left py-3 px-4">Customer</th>
              <th className="text-right py-3 px-4">Total</th>
              <th className="text-center py-3 px-4">Status</th>
              <th className="text-center py-3 px-4">Payment</th>
              <th className="text-center py-3 px-4">Shipping</th>
              <th className="text-left py-3 px-4">Date</th>
              <th className="text-center py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4 font-mono text-sm">{order.orderNumber}</td>
                <td className="py-3 px-4">{order.customerName}</td>
                <td className="py-3 px-4 text-right font-semibold">
                  R$ {order.total.toLocaleString('pt-BR')}
                </td>
                <td className="py-3 px-4 text-center">
                  <Badge status={order.status}>{order.status}</Badge>
                </td>
                <td className="py-3 px-4 text-center">
                  <Badge variant={order.paymentStatus === 'Succeeded' ? 'success' : 'warning'}>
                    {order.paymentStatus}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-center">
                  <Badge variant="info">{order.shippingStatus}</Badge>
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">
                  {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                </td>
                <td className="py-3 px-4 text-center">
                  <OrderActionsDropdown
                    order={order}
                    onViewDetail={() => {
                      setSelectedOrder(order);
                      setShowDetail(true);
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <Pagination
        current={page}
        total={Math.ceil(total / pageSize)}
        onPageChange={setPage}
      />

      {/* Detail Modal */}
      {showDetail && selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setShowDetail(false)}
          onUpdate={loadOrders}
        />
      )}
    </div>
  );
}
```

---

## 4. USERS & PERMISSIONS MANAGEMENT

```typescript
// src/app/(admin)/users/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Table, Modal, Form } from '@/components/ui';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  lastLogin: string;
  isActive: boolean;
}

const ROLES = [
  { id: 'Customer', name: 'Customer', description: 'Regular customer' },
  { id: 'AdminGeneral', name: 'Admin General', description: 'Full admin access' },
  { id: 'AdminPayments', name: 'Admin Payments', description: 'Payments only' },
  { id: 'AdminInventory', name: 'Admin Inventory', description: 'Inventory only' },
  { id: 'AdminCompliance', name: 'Admin Compliance', description: 'Compliance only' },
  { id: 'AuditUser', name: 'Audit User', description: 'Read-only audit access' }
];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data);
    } catch (err) {
      console.error('Failed to load users', err);
    }
  };

  const handleCreateUser = async (formData: any) => {
    try {
      await api.post('/admin/users', formData);
      setShowCreateModal(false);
      loadUsers();
    } catch (err) {
      console.error('Failed to create user', err);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await api.patch(`/admin/users/${userId}`, { role: newRole });
      loadUsers();
    } catch (err) {
      console.error('Failed to update user role', err);
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    if (confirm('Are you sure?')) {
      try {
        await api.post(`/admin/users/${userId}/deactivate`);
        loadUsers();
      } catch (err) {
        console.error('Failed to deactivate user', err);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Users Management</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          + New User
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="text-left py-3 px-4">Name</th>
              <th className="text-left py-3 px-4">Email</th>
              <th className="text-left py-3 px-4">Role</th>
              <th className="text-left py-3 px-4">Last Login</th>
              <th className="text-center py-3 px-4">Status</th>
              <th className="text-center py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4">{user.name}</td>
                <td className="py-3 px-4">{user.email}</td>
                <td className="py-3 px-4">
                  <select
                    value={user.role}
                    onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1"
                  >
                    {ROLES.map(role => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                </td>
                <td className="py-3 px-4 text-sm text-gray-600">
                  {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                </td>
                <td className="py-3 px-4 text-center">
                  <span className={`px-3 py-1 rounded text-sm ${
                    user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  {user.isActive && (
                    <button
                      onClick={() => handleDeactivateUser(user.id)}
                      className="text-red-600 hover:underline text-sm"
                    >
                      Deactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <Modal
          title="Create New User"
          onClose={() => setShowCreateModal(false)}
        >
          <Form
            onSubmit={handleCreateUser}
            fields={[
              { name: 'name', label: 'Name', type: 'text', required: true },
              { name: 'email', label: 'Email', type: 'email', required: true },
              {
                name: 'role',
                label: 'Role',
                type: 'select',
                options: ROLES,
                required: true
              },
              { name: 'password', label: 'Password', type: 'password', required: true }
            ]}
          />
        </Modal>
      )}
    </div>
  );
}
```

---

## 5. ADMIN PANEL CHECKLIST

```markdown
## Implementation Checklist

### Backend API
- [ ] GET /admin/dashboard
- [ ] GET /admin/orders
- [ ] GET /admin/orders/export
- [ ] PATCH /admin/orders/{id}
- [ ] GET /admin/inventory
- [ ] POST /admin/inventory/{id}/adjust
- [ ] GET /admin/users
- [ ] POST /admin/users
- [ ] PATCH /admin/users/{id}
- [ ] GET /admin/products
- [ ] POST /admin/products
- [ ] PUT /admin/products/{id}
- [ ] GET /admin/payments
- [ ] GET /admin/refunds
- [ ] GET /admin/audit-logs

### Frontend Pages
- [ ] Dashboard (overview)
- [ ] Orders list + detail
- [ ] Inventory management
- [ ] Users management
- [ ] Products management
- [ ] Payments review
- [ ] Refunds management
- [ ] Reports & analytics
- [ ] Settings
- [ ] Audit logs

### Features
- [ ] Role-based access control
- [ ] Data filtering & search
- [ ] CSV/PDF export
- [ ] Real-time notifications
- [ ] Bulk actions
- [ ] Audit logging

### Testing
- [ ] Unit: Permission checks
- [ ] Integration: API endpoints
- [ ] E2E: Admin workflows
```

---

**Admin Panel Detailed Specification Completo ✅**
