// src/types/api.ts

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  token?: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  averageOrderValue: number;
  revenueGrowth: number;
  ordersGrowth: number;
  revenueChange?: number;
  ordersChange?: number;
  customersChange?: number;
  conversionRate?: number;
  conversionChange?: number;
  recentOrders?: Array<{ id: string; customerName: string; amount: number; status: string }>;
  topProducts?: Array<{ id: string; name: string; sales: number }>;
  newCustomers?: number;
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Order {
  id: string;
  userId: string;
  customerName?: string;
  customerEmail?: string;
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  totalAmount: number;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  description: string;
  price: number;
  originalPrice?: number;
  stock: number;
  category: string;
  isActive: boolean;
  isFeatured?: boolean;
  viewCount?: number;
  imageUrl?: string;
  images?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  email: string;
  name: string;
  phone?: string;
  city?: string;
  country?: string;
  address?: string;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  productId: string;
  sku: string;
  current: number;
  reserved: number;
  available: number;
  lastAdjusted: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  expiryDate: string;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface CustomerViewedItem {
  productId: string;
  productName: string;
  category: string;
  views: number;
  lastSeenAt: string;
}

export interface CustomerFavoritedItem {
  productId: string;
  productName: string;
  category: string;
  favoritedAt: string;
}

export interface CustomerSuggestedItem {
  id: string;
  name: string;
  category: string;
  price: number;
  viewCount?: number;
  isFeatured?: boolean;
}

export interface ReportProductRow {
  productId: string;
  productName: string;
  category: string;
  quantity: number;
  revenue: number;
}

export interface PeriodReport {
  period: 'daily' | 'weekly' | 'monthly' | string;
  startUtc: string;
  endUtc: string;
  ordersPlaced: number;
  ordersSold: number;
  ordersCancelled: number;
  soldRevenue: number;
  productsSoldQuantity: number;
  productsCancelledQuantity: number;
  cartItemsAdded: number;
  cartItemsOpen: number;
  cartItemsAbandoned: number;
  signups: number;
  productViews: number;
  wishlistAdds: number;
  cartToSaleConversionRate: number;
  cancelRate: number;
  cartAbandonRate: number;
  topSoldProducts: ReportProductRow[];
  topAddedToCartProducts: ReportProductRow[];
  topCancelledProducts: ReportProductRow[];
  topViewedProducts: ReportProductRow[];
  topFavoritedProducts: ReportProductRow[];
  insights: string[];
}

export interface ReportsOverview {
  generatedAt: string;
  daily: PeriodReport;
  weekly: PeriodReport;
  monthly: PeriodReport;
}
