import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5071/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const productApi = {
  getAll: () => api.get('/products'),
  getById: (id: string) => api.get(`/products/${id}`),
  getByCategory: (category: string) => api.get(`/products/category/${category}`),
  create: (data: Record<string, unknown>) => api.post('/products', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/admin/products/${id}`),
  updateStock: (id: string, newStock: number) => api.patch(`/admin/products/${id}/stock`, { newStock }),
};

export const orderApi = {
  getAll: () => api.get('/admin/orders'),
  getById: (id: string) => api.get(`/admin/orders/${id}/details`),
  getByStatus: (status: string) => api.get(`/admin/orders/status/${status}`),
  updateStatus: (id: string, status: string) => api.patch(`/orders/${id}/status`, { status }),
};

export const userApi = {
  getAll: () => api.get('/admin/users'),
  getById: (id: string) => api.get(`/admin/users/${id}`),
};

export const statisticsApi = {
  getDashboard: () => api.get('/admin/statistics/dashboard'),
  getSales: (startDate: string, endDate: string) => api.get('/admin/statistics/sales', { params: { startDate, endDate } }),
  getTopProducts: (limit: number = 10) => api.get(`/admin/statistics/top-products?limit=${limit}`),
  getTopCategories: () => api.get('/admin/statistics/top-categories'),
  getRevenue: (startDate?: string, endDate?: string) => api.get('/admin/statistics/revenue', { params: { startDate, endDate } }),
};

export default api;
