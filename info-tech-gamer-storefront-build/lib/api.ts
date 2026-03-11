import type {
  Product,
  ProductSummary,
  User,
  Address,
  Order,
  OrderWithHistory,
  UserStats,
  CartItem,
  SubscriptionPlan,
  Banner,
  CouponValidation,
} from "./types"

const RAW_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "development" ? "http://localhost:5071" : "")
const API_BASE = RAW_BASE_URL.replace(/\/+$/, "")
const API = API_BASE.endsWith("/api/v1") ? API_BASE : `${API_BASE}/api/v1`
const API_ORIGIN = API_BASE.endsWith("/api/v1") ? API_BASE.slice(0, -7) : API_BASE
const ORDER_STATUS_LABELS: Record<number, string> = {
  0: "Pending",
  1: "Confirmed",
  2: "Processing",
  3: "Shipped",
  4: "Delivered",
  5: "Cancelled",
}


class ApiRequestError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "ApiRequestError"
    this.status = status
  }
}

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("accessToken")
}

export function hasAccessToken(): boolean {
  return !!getAccessToken()
}

function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("refreshToken")
}

function setTokens(access: string, refresh?: string) {
  localStorage.setItem("accessToken", access)
  if (refresh) localStorage.setItem("refreshToken", refresh)
}

function setUserId(userId: string) {
  localStorage.setItem("userId", userId)
}

function getUserId(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("userId")
}

export function clearTokens() {
  localStorage.removeItem("accessToken")
  localStorage.removeItem("userId")
  localStorage.removeItem("refreshToken")
}

function normalizeStatus(value: unknown): string {
  if (typeof value === "string" && value.trim().length > 0) return value
  if (typeof value === "number" && ORDER_STATUS_LABELS[value]) return ORDER_STATUS_LABELS[value]
  return "Processing"
}


function resolveMediaUrl(value: unknown): string | undefined {
  const url = String(value ?? "").trim()
  if (!url) return undefined
  if (url.startsWith("data:") || url.startsWith("blob:")) return url
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith("//")) return `https:${url}`
  if (url.startsWith("/")) return API_ORIGIN ? `${API_ORIGIN}${url}` : url
  return API_ORIGIN ? `${API_ORIGIN}/${url.replace(/^\/+/, "")}` : url
}
function normalizeProduct(raw: any): Product {
  return {
    id: String(raw?.id ?? raw?.Id ?? ""),
    name: String(raw?.name ?? raw?.Name ?? ""),
    price: Number(raw?.price ?? raw?.Price ?? 0),
    imageUrl: resolveMediaUrl(raw?.imageUrl ?? raw?.ImageUrl),
    category: raw?.category ?? raw?.Category,
    rating: raw?.rating ?? raw?.Rating,
    description: raw?.description ?? raw?.Description,
    stock: raw?.stock ?? raw?.Stock,
    brand: raw?.brand ?? raw?.Brand,
  }
}

function normalizeUser(raw: any): User {
  return {
    id: raw?.id ?? raw?.Id,
    name: raw?.name ?? raw?.Name ?? raw?.fullName ?? raw?.FullName ?? "",
    email: raw?.email ?? raw?.Email ?? "",
    phone: raw?.phone ?? raw?.Phone,
    address: raw?.address ?? raw?.Address,
    role: raw?.role ?? raw?.Role,
  }
}

function normalizeAddress(raw: any): Address {
  return {
    id: String(raw?.id ?? raw?.Id ?? ""),
    label: String(raw?.label ?? raw?.Label ?? ""),
    recipientName: raw?.recipientName ?? raw?.RecipientName,
    phone: raw?.phone ?? raw?.Phone,
    street: String(raw?.line1 ?? raw?.Line1 ?? raw?.street ?? raw?.Street ?? ""),
    line2: raw?.line2 ?? raw?.Line2,
    city: String(raw?.city ?? raw?.City ?? ""),
    state: String(raw?.state ?? raw?.State ?? ""),
    zip: String(raw?.postalCode ?? raw?.PostalCode ?? raw?.zip ?? raw?.Zip ?? ""),
    country: String(raw?.country ?? raw?.Country ?? ""),
    isDefault: raw?.isDefault ?? raw?.IsDefault,
  }
}

async function refreshAccessToken(): Promise<boolean> {
  try {
    const csrfToken = getCsrfToken()
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (csrfToken) {
      headers["X-CSRF-Token"] = csrfToken
    }

    const refreshToken = getRefreshToken()

    const res = await fetch(`${API}/auth/refresh`, {
      method: "POST",
      headers,
      body: refreshToken ? JSON.stringify({ refreshToken }) : undefined,
      credentials: "include",
    })
    if (!res.ok) return false
    const data = (await res.json()) as { accessToken?: string; refreshToken?: string; user?: any }
    if (!data.accessToken) return false
    setTokens(data.accessToken, data.refreshToken)
    if (data.user?.id) setUserId(String(data.user.id))
    return true
  } catch {
    return false
  }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  useMock?: () => T
): Promise<T> {
  const token = getAccessToken()
  const isPublicAuthPath =
    path === "/auth/login" ||
    path === "/auth/register" ||
    path === "/auth/refresh" ||
    path === "/auth/forgot-password" ||
    path === "/auth/reset-password" ||
    path === "/auth/verify-email" ||
    path === "/auth/resend-verification" ||
    path.startsWith("/auth/social/")

  if (!token && path.startsWith("/users/me")) {
    throw new ApiRequestError(401, "Not authenticated")
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }
  const csrfToken = getCsrfToken()
  if (csrfToken) {
    headers["X-CSRF-Token"] = csrfToken
  }
  if (token && !isPublicAuthPath) {
    headers["Authorization"] = `Bearer ${token}`
  }

  try {
    let res = await fetch(`${API}${path}`, { ...options, headers, credentials: "include" })

    if (res.status === 401 && token && !isPublicAuthPath) {
      const refreshed = await refreshAccessToken()
      if (refreshed) {
        headers["Authorization"] = `Bearer ${getAccessToken()}`
        res = await fetch(`${API}${path}`, { ...options, headers, credentials: "include" })
      }
    }

    if (!res.ok) {
      const bodyText = await res.text()
      let message = `API error: ${res.status}`

      if (bodyText) {
        try {
          const parsed = JSON.parse(bodyText)
          const apiMessage = parsed?.message || parsed?.error || parsed?.title
          if (typeof apiMessage === "string" && apiMessage.trim()) {
            message = apiMessage.trim()
          }
        } catch {
          message = bodyText.slice(0, 200)
        }
      }

      if (res.status === 401 && !isPublicAuthPath) {
        clearTokens()
        throw new ApiRequestError(401, "Session expired. Please sign in again.")
      }

      throw new ApiRequestError(res.status, message)
    }

    if (res.status === 204) return undefined as T
    const text = await res.text()
    if (!text) return undefined as T
    return JSON.parse(text) as T
  } catch (error) {
    if (useMock) return useMock()
    if (error instanceof Error) throw error
    throw new Error(`Failed to fetch ${path}`)
  }
}

// --- Auth ---

export async function login(email: string, password: string) {
  const data = await apiFetch<{ accessToken: string; refreshToken?: string; user?: any }>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }
  )
  setTokens(data.accessToken, data.refreshToken)
  if (data.user?.id) setUserId(String(data.user.id))
  return data
}

export async function register(name: string, email: string, password: string) {
  const data = await apiFetch<{ accessToken?: string; refreshToken?: string; user?: any; message?: string }>(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    }
  )
  if (data.accessToken) {
    setTokens(data.accessToken, data.refreshToken)
  }
  if (data.user?.id) setUserId(String(data.user.id))
  return data
}

export async function forgotPassword(email: string) {
  return await apiFetch<{ message?: string }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  })
}

export async function resendVerification(email: string) {
  return await apiFetch<{ message?: string }>("/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  })
}

export async function verifyEmail(token: string) {
  return await apiFetch<{ message?: string }>("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  })
}

// --- Products ---
export async function getProductCategories(): Promise<string[]> {
  const data = await apiFetch<any[]>("/products")
  const categories = new Set<string>()

  for (const raw of data || []) {
    const category = String(raw?.category ?? raw?.Category ?? "").trim()
    if (category.length > 0) categories.add(category)
  }

  const sorted = Array.from(categories).sort((a, b) => a.localeCompare(b))
  return ["All", ...sorted]
}

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const data = await apiFetch<any[]>("/subscriptions/plans")
  return (data || []).map((plan) => ({
    id: String(plan?.id ?? plan?.Id ?? ""),
    name: String(plan?.name ?? plan?.Name ?? ""),
    price: Number(plan?.price ?? plan?.Price ?? 0),
    interval: String(plan?.interval ?? plan?.Interval ?? "month"),
    features: Array.isArray(plan?.features ?? plan?.Features)
      ? (plan.features ?? plan.Features).map((f: unknown) => String(f))
      : [],
    highlighted: Boolean(plan?.highlighted ?? plan?.Highlighted),
  }))
}

export async function searchProducts(params: {
  query?: string
  category?: string
  minPrice?: number
  maxPrice?: number
  page?: number
  pageSize?: number
}): Promise<{ items: Product[]; total: number }> {
  const qs = new URLSearchParams()
  if (params.query) qs.set("query", params.query)
  if (params.category && params.category !== "All") qs.set("category", params.category)
  if (params.minPrice !== undefined) qs.set("minPrice", String(params.minPrice))
  if (params.maxPrice !== undefined) qs.set("maxPrice", String(params.maxPrice))
  if (params.page) qs.set("page", String(params.page))
  if (params.pageSize) qs.set("pageSize", String(params.pageSize))

  const data = await apiFetch<any>(`/products/search?${qs.toString()}`)
  const rawItems = data?.items ?? data?.Items ?? []
  const total = data?.total ?? data?.Total ?? rawItems.length
  return { items: rawItems.map(normalizeProduct), total }
}

export async function getProduct(id: string): Promise<Product | null> {
  const data = await apiFetch<any>(`/products/${id}`)
  return data ? normalizeProduct(data) : null
}

export async function getRecommendations(): Promise<ProductSummary[]> {
  const data = await apiFetch<any[]>("/recommendations")
  return (data || []).map((item) => ({
    id: String(item?.id ?? item?.Id ?? ""),
    name: String(item?.name ?? item?.Name ?? ""),
    price: Number(item?.price ?? item?.Price ?? 0),
    imageUrl: resolveMediaUrl(item?.imageUrl ?? item?.ImageUrl),
  }))
}

// --- User ---

export async function getMe(): Promise<User> {
  const data = await apiFetch<any>("/users/me")
  const user = normalizeUser(data)
  if (user.id) setUserId(user.id)
  return user
}

export async function updateMe(data: Partial<User>): Promise<User> {
  const payload = {
    name: data.name,
    email: data.email,
  }
  const updated = await apiFetch<any>("/users/me", { method: "PUT", body: JSON.stringify(payload) })
  const user = normalizeUser(updated)
  if (user.id) setUserId(user.id)
  return user
}

export async function getMyOrders(): Promise<Order[]> {
  const data = await apiFetch<any[]>("/users/me/orders")
  return (data || []).map((item) => ({
    id: String(item?.id ?? item?.Id ?? ""),
    date: item?.createdAt ?? item?.CreatedAt,
    total: Number(item?.totalAmount ?? item?.TotalAmount ?? 0),
    status: normalizeStatus(item?.status ?? item?.Status),
  }))
}

export async function getMyStats(): Promise<UserStats> {
  const data = await apiFetch<any>("/users/me/stats")
  return {
    orders: Number(data?.orders ?? 0),
    spent: Number(data?.spent ?? 0),
    favorites: Number(data?.favorites ?? 0),
    reviews: Number(data?.reviews ?? 0),
  }
}

// --- Addresses ---

export async function getMyAddresses(): Promise<Address[]> {
  const data = await apiFetch<any[]>("/users/me/addresses")
  return (data || []).map(normalizeAddress)
}

export async function createAddress(address: Omit<Address, "id">): Promise<Address> {
  const payload = {
    label: address.label,
    recipientName: address.recipientName,
    phone: address.phone,
    line1: address.street,
    line2: address.line2,
    city: address.city,
    state: address.state,
    postalCode: address.zip,
    country: address.country,
    isDefault: address.isDefault ?? false,
  }
  const data = await apiFetch<any>("/users/me/addresses", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return normalizeAddress(data)
}

export async function updateAddress(id: string, address: Partial<Address>): Promise<Address> {
  const payload = {
    label: address.label,
    recipientName: address.recipientName,
    phone: address.phone,
    line1: address.street,
    line2: address.line2,
    city: address.city,
    state: address.state,
    postalCode: address.zip,
    country: address.country,
    isDefault: address.isDefault,
  }
  const data = await apiFetch<any>(`/users/me/addresses/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
  return normalizeAddress(data)
}

export async function deleteAddress(id: string): Promise<void> {
  await apiFetch(`/users/me/addresses/${id}`, { method: "DELETE" })
}

export async function setDefaultAddress(id: string): Promise<void> {
  await apiFetch(`/users/me/addresses/${id}/default`, { method: "POST" })
}

// --- Cart ---

async function hydrateCartItems(items: Array<{ id?: string; Id?: string; productId?: string; ProductId?: string; quantity?: number; Quantity?: number; }>): Promise<CartItem[]> {
  const results: CartItem[] = []
  for (const item of items || []) {
    const productId = String(item.productId ?? item.ProductId ?? "")
    if (!productId) continue
    const product = await getProduct(productId)
    if (!product) continue
    results.push({
      id: String(item.id ?? item.Id ?? ""),
      product,
      quantity: Number(item.quantity ?? item.Quantity ?? 0),
    })
  }
  return results
}

export async function getCart(): Promise<CartItem[]> {
  const data = await apiFetch<any[]>("/cart")
  return hydrateCartItems(data || [])
}

export async function addToCart(productId: string, quantity: number): Promise<void> {
  await apiFetch("/cart/items", {
    method: "POST",
    body: JSON.stringify({ productId, quantity }),
  })
}

export async function updateCartItem(itemId: string, quantity: number): Promise<void> {
  await apiFetch(`/cart/items/${itemId}`, {
    method: "PUT",
    body: JSON.stringify({ quantity }),
  })
}

export async function removeCartItem(itemId: string): Promise<void> {
  await apiFetch(`/cart/items/${itemId}`, { method: "DELETE" })
}

export async function clearCartApi(): Promise<void> {
  await apiFetch("/cart", { method: "DELETE" })
}

// --- Wishlists ---

async function ensureUserId(): Promise<string | null> {
  const cached = getUserId()
  if (cached) return cached
  try {
    const me = await getMe()
    if (me?.id) {
      setUserId(me.id)
      return me.id
    }
  } catch {
    return null
  }
  return null
}

export async function getDefaultWishlist(): Promise<{ wishlistId: string; items: ProductSummary[] }> {
  const userId = await ensureUserId()
  if (!userId) throw new Error("Not authenticated")
  const data = await apiFetch<any>(`/wishlists/default?userId=${userId}`)
  const wishlistId = String(data?.id ?? data?.Id ?? data?.wishlistId ?? data?.WishlistId ?? "")
  const itemsRaw = data?.items ?? data?.Items ?? []
  const items: ProductSummary[] = []
  for (const item of itemsRaw) {
    const productId = String(item?.productId ?? item?.ProductId ?? "")
    if (!productId) continue
    const product = await getProduct(productId)
    if (!product) continue
    items.push({
      id: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      wishlistItemId: String(item?.id ?? item?.Id ?? ""),
    })
  }
  return { wishlistId, items }
}

export async function addWishlistItem(wishlistId: string, productId: string): Promise<ProductSummary> {
  const data = await apiFetch<any>(`/wishlists/${wishlistId}/items`, {
    method: "POST",
    body: JSON.stringify({ productId }),
  })
  const added = data?.addedItem ?? data?.AddedItem
  const product = await getProduct(productId)
  if (!product) throw new Error("Product not found")
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    imageUrl: product.imageUrl,
    wishlistItemId: String(added?.id ?? added?.Id ?? ""),
  }
}

export async function removeWishlistItem(wishlistId: string, itemId: string): Promise<void> {
  await apiFetch(`/wishlists/${wishlistId}/items/${itemId}`, { method: "DELETE" })
}

export async function wishlistContains(productId: string): Promise<boolean> {
  const userId = await ensureUserId()
  if (!userId) return false
  const data = await apiFetch<any>(`/wishlists/contains/${productId}?userId=${userId}`)
  return Boolean(data?.contains ?? data?.Contains)
}


// --- Marketing ---

export async function getActiveBanners(): Promise<Banner[]> {
  const data = await apiFetch<any[]>("/banners")
  return (data || []).map((item) => ({
    id: String(item?.id ?? item?.Id ?? ""),
    title: String(item?.title ?? item?.Title ?? ""),
    image: String(resolveMediaUrl(item?.image ?? item?.Image) ?? ""),
    link: item?.link ?? item?.Link,
    startDate: item?.startDate ?? item?.StartDate,
    endDate: item?.endDate ?? item?.EndDate,
  }))
}

export async function validateCoupon(code: string): Promise<CouponValidation> {
  const qs = new URLSearchParams({ code: code.trim() })
  const data = await apiFetch<any>("/coupons/validate?" + qs.toString())
  return {
    code: String(data?.code ?? data?.Code ?? ""),
    discount: Number(data?.discount ?? data?.Discount ?? 0),
    active: Boolean(data?.active ?? data?.Active),
  }
}
// --- Orders ---

export async function createOrderFromCart(couponCode?: string): Promise<{ id: string; totalAmount: number }> {
  const body = couponCode ? JSON.stringify({ couponCode }) : undefined
  const data = await apiFetch<any>("/orders/from-cart", { method: "POST", body })
  return {
    id: String(data?.id ?? data?.Id ?? ""),
    totalAmount: Number(data?.totalAmount ?? data?.TotalAmount ?? 0),
  }
}

export async function createPayment(orderId: string, method: string, amount: number): Promise<void> {
  await apiFetch("/payments", {
    method: "POST",
    body: JSON.stringify({ orderId, method, amount }),
  })
}

export async function createCheckout(orderId: string, payerEmail?: string): Promise<{ initPoint?: string; sandboxInitPoint?: string }> {
  const data = await apiFetch<any>("/payments/checkout", {
    method: "POST",
    body: JSON.stringify({ orderId, payerEmail }),
  })
  return {
    initPoint: data?.initPoint ?? data?.InitPoint,
    sandboxInitPoint: data?.sandboxInitPoint ?? data?.SandboxInitPoint,
  }
}
export async function createTransparentCheckout(payload: {
  orderId: string
  method: "pix" | "boleto" | "card"
  amount: number
  payer: {
    email: string
    firstName: string
    lastName: string
    identificationType?: string
    identificationNumber: string
    phoneAreaCode: string
    phoneNumber: string
  }
  paymentMethodId?: string
}): Promise<{
  paymentId: string
  status: string
  statusMessage?: string
  gatewayStatus?: string
  pixQrCode?: string
  pixQrCodeBase64?: string
  boletoUrl?: string
}> {
  const data = await apiFetch<any>("/payments/transparent", {
    method: "POST",
    body: JSON.stringify({
      orderId: payload.orderId,
      method: payload.method,
      amount: payload.amount,
      paymentMethodId: payload.paymentMethodId,
      payer: payload.payer,
    }),
  })

  return {
    paymentId: String(data?.paymentId ?? data?.PaymentId ?? ""),
    status: String(data?.status ?? data?.Status ?? ""),
    statusMessage: data?.statusMessage ?? data?.StatusMessage,
    gatewayStatus: data?.gatewayStatus ?? data?.GatewayStatus,
    pixQrCode: data?.pixQrCode ?? data?.PixQrCode,
    pixQrCodeBase64: data?.pixQrCodeBase64 ?? data?.PixQrCodeBase64,
    boletoUrl: data?.boletoUrl ?? data?.BoletoUrl,
  }
}

// --- Orders ---

export async function getOrder(id: string): Promise<OrderWithHistory | null> {
  const data = await apiFetch<any>(`/orders/track/${id}`)
  if (!data) return null
  const createdAt = data?.createdAt ?? data?.CreatedAt
  const updatedAt = data?.updatedAt ?? data?.UpdatedAt ?? createdAt
  const status = normalizeStatus(data?.status ?? data?.Status)
  const history = [] as Array<{ date: string; status: string }>
  if (createdAt) history.push({ date: createdAt, status: "Order Placed" })
  if (status !== "Order Placed") {
    history.push({ date: updatedAt || new Date().toISOString(), status })
  }

  return {
    id: String(data?.id ?? data?.Id ?? id),
    status,
    updated: updatedAt,
    history,
  }
}

// --- Support ---

export async function createSupportTicket(data: {
  email: string
  subject: string
  message: string
}) {
  return apiFetch(
    "/support/tickets",
    { method: "POST", body: JSON.stringify(data) }
  )
}

// --- Subscriptions ---

export async function subscribe(plan: string, email: string) {
  return apiFetch(
    "/subscriptions",
    { method: "POST", body: JSON.stringify({ plan, email }) }
  )
}

// --- Analytics ---

export async function trackEvent(data: {
  userId: string | null
  type: string
  category: string
  action: string
  label: string
  value: number
  url: string | null
}) {
  const token = getAccessToken()
  if (!token) return
  try {
    await apiFetch("/analytics/events", {
      method: "POST",
      body: JSON.stringify(data),
    })
  } catch {
    // Analytics failures are silent
  }
}



