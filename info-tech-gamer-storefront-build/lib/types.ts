export interface Product {
  id: string
  name: string
  price: number
  imageUrl?: string
  category?: string
  rating?: number
  description?: string
  stock?: number
  brand?: string
}

export interface ProductSummary {
  id: string
  name: string
  price: number
  imageUrl?: string
  wishlistItemId?: string
}

export interface User {
  id?: string
  name: string
  email: string
  phone?: string
  address?: string
  role?: string
}

export interface Address {
  id: string
  label: string
  recipientName?: string
  phone?: string
  street: string
  line2?: string
  city: string
  state: string
  zip: string
  country: string
  isDefault?: boolean
}

export interface Order {
  id: string
  date?: string
  total?: number
  status?: string
}

export interface OrderWithHistory {
  id: string
  status: string
  carrier?: string
  updated?: string
  history?: Array<{ date: string; status: string }>
  items?: Array<{ id: string; name: string; qty: number }>
  estimatedDelivery?: string
}

export interface CartItem {
  id?: string
  product: Product
  quantity: number
}

export interface UserStats {
  orders: number
  spent: number
  favorites: number
  reviews: number
}

export interface SupportTicket {
  email: string
  subject: string
  message: string
}

export interface SubscriptionPlan {
  id: string
  name: string
  price: number
  interval: string
  features: string[]
  highlighted?: boolean
}

export interface Banner {
  id: string
  title: string
  image: string
  link?: string
  startDate?: string
  endDate?: string
}

export interface CouponValidation {
  code: string
  discount: number
  active: boolean
}

