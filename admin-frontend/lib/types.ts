export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  sku: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Order {
  id: string;
  userId: string;
  status: string;
  totalAmount: number;
  items: OrderItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  isEmailVerified: boolean;
  createdAt: string;
}

export interface DashboardStatistics {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
  averageOrderValue: number;
}

export interface SalesStatistics {
  totalSales: number;
  orderCount: number;
  averageOrderValue: number;
  startDate: string;
  endDate: string;
}

export interface TopProductStatistic {
  productId: string;
  totalQuantitySold: number;
  totalRevenue: number;
}

export interface TopCategoryStatistic {
  category: string;
  totalQuantitySold: number;
  totalRevenue: number;
}

export interface RevenueStatistics {
  totalRevenue: number;
  orderCount: number;
  averageOrderValue: number;
}
