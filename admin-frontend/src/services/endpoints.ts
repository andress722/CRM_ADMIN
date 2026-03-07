// src/services/endpoints.ts

import { ApiValue } from "@/types";

const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5071";
const API_BASE = RAW_API_URL.replace(/\/+$/, "");
const API_URL = API_BASE.endsWith("/api/v1") ? API_BASE : `${API_BASE}/api/v1`;

export const LEGACY_API_URL = API_URL;
export { API_BASE, API_URL };

export const endpoints = {
  // Auth
  auth: {
    login: `${API_URL}/auth/login`,
    refresh: `${API_URL}/auth/refresh`,
    logout: `${API_URL}/auth/logout`,
    me: `${API_URL}/auth/me`,
  },

  // Admin
  admin: {
    overview: `${API_URL}/admin/overview`,
    // Orders
    orders: `${API_URL}/admin/orders`,
    orderDetail: (id: string) => `${API_URL}/admin/orders/${id}`,
    orderStatusUpdate: (id: string) => `${API_URL}/admin/orders/${id}/status`,
    // Products
    products: `${API_URL}/admin/products`,
    productDetail: (id: string) => `${API_URL}/admin/products/${id}`,
    productImages: (id: string) => `${API_URL}/admin/product-images/${id}`,
    productFeatured: (id: string) => `${API_URL}/admin/products/${id}/featured`,
    // Customers
    customers: `${API_URL}/admin/customers`,
    customerDetail: (id: string) => `${API_URL}/admin/customers/${id}`,
    customerViewedItems: (id: string) => `${API_URL}/admin/users/${id}/viewed-items`,
    customerFavoritedItems: (id: string) => `${API_URL}/admin/users/${id}/favorited-items`,
    customerSuggestedItems: (id: string) => `${API_URL}/admin/users/${id}/suggested-items`,
    // Inventory
    inventory: `${API_URL}/inventory`,
    inventoryAdjust: `${API_URL}/inventory/adjust`,
    // Promotions
    coupons: `${API_URL}/admin/promotions/coupons`,
    couponDetail: (id: string) => `${API_URL}/admin/promotions/coupons/${id}`,
    // Admins
    admins: `${API_URL}/admin/admins`,
    adminDetail: (id: string) => `${API_URL}/admin/admins/${id}`,
    // Logs
    logs: `${API_URL}/admin/logs`,
    // Notifications
    notifications: `${API_URL}/admin/notifications`,
    // Reports
    reports: `${API_URL}/admin/reports`,
    reportsOverview: `${API_URL}/admin/reports/overview`,
    reportsOverviewEmail: `${API_URL}/admin/reports/overview/email`,
    // Settings
    settings: `${API_URL}/admin/settings`,
    // Integrations
    integrations: `${API_URL}/admin/integrations`,
    // Webhooks
    webhooks: `${API_URL}/admin/webhooks`,
    // Banners
    banners: `${API_URL}/admin/banners`,
    // Profile
    profile: `${API_URL}/admin/profile`,
    // CRM
    crmLeads: `${API_URL}/admin/crm/leads`,
    crmLeadDetail: (id: string) => `${API_URL}/admin/crm/leads/${id}`,
    crmDeals: `${API_URL}/admin/crm/deals`,
    crmDealDetail: (id: string) => `${API_URL}/admin/crm/deals/${id}`,
    crmContacts: `${API_URL}/admin/crm/contacts`,
    crmContactDetail: (id: string) => `${API_URL}/admin/crm/contacts/${id}`,
    crmContactSendViewedSuggestions: (id: string) => `${API_URL}/admin/crm/contacts/${id}/send-viewed-suggestions`,
    crmActivities: `${API_URL}/admin/crm/activities`,
    crmActivityDetail: (id: string) => `${API_URL}/admin/crm/activities/${id}`,
    crmReportsOverview: `${API_URL}/admin/crm/reports/overview`,
    crmReportsOverviewEmail: `${API_URL}/admin/crm/reports/overview/email`,
  },
} as const;

export const getApiUrl = (
  endpoint: string,
  params?: Record<string, ApiValue>,
) => {
  let url = endpoint;
  if (params) {
    const queryString = new URLSearchParams(
      Object.entries(params).reduce(
        (acc, [key, value]) => {
          if (value !== undefined && value !== null) {
            acc[key] = String(value);
          }
          return acc;
        },
        {} as Record<string, string>,
      ),
    ).toString();
    url = queryString ? `${endpoint}?${queryString}` : endpoint;
  }
  return url;
};

