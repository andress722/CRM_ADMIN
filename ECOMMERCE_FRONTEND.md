# FRONTEND SPECIFICATION - SISTEMA E-COMMERCE "Loja de Produtos"

**Stack:** Next.js 14 + TypeScript + Tailwind CSS  
**State Management:** Zustand + React Query  
**UI Library:** Shadcn/ui  
**Payment Integration:** Stripe.js (agnostic para Mercado Pago/PayPal)

---

## 1. ARQUITETURA FRONTEND

### 1.1 Estrutura de Pastas

```
apps/frontend/
├── public/
│   ├── images/
│   ├── icons/
│   └── fonts/
├── src/
│   ├── app/                    # Next.js 14 App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx            # Home
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── verify-email/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   └── reset-password/page.tsx
│   │   ├── (shop)/
│   │   │   ├── products/page.tsx
│   │   │   ├── products/[id]/page.tsx
│   │   │   ├── cart/page.tsx
│   │   │   ├── checkout/page.tsx
│   │   │   └── order-confirmation/[id]/page.tsx
│   │   ├── (user)/
│   │   │   ├── orders/page.tsx
│   │   │   ├── orders/[id]/page.tsx
│   │   │   ├── profile/page.tsx
│   │   │   └── sessions/page.tsx
│   │   └── (admin)/
│   │       ├── dashboard/page.tsx
│   │       ├── products/page.tsx
│   │       ├── categories/page.tsx
│   │       ├── promotions/page.tsx
│   │       ├── coupons/page.tsx
│   │       └── orders/page.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Navigation.tsx
│   │   ├── product/
│   │   │   ├── ProductCard.tsx
│   │   │   ├── ProductGrid.tsx
│   │   │   ├── ProductDetail.tsx
│   │   │   ├── ProductImages.tsx
│   │   │   └── ProductVariations.tsx
│   │   ├── cart/
│   │   │   ├── CartSummary.tsx
│   │   │   ├── CartItems.tsx
│   │   │   ├── CartItem.tsx
│   │   │   ├── Coupon.tsx
│   │   │   └── Promotions.tsx
│   │   ├── checkout/
│   │   │   ├── ShippingForm.tsx
│   │   │   ├── PaymentForm.tsx
│   │   │   ├── OrderSummary.tsx
│   │   │   └── PaymentRedirect.tsx
│   │   ├── search/
│   │   │   ├── SearchBar.tsx
│   │   │   ├── SearchSuggestions.tsx
│   │   │   ├── Filters.tsx
│   │   │   └── SortOptions.tsx
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   ├── EmailVerification.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Loading.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   └── admin/
│   │       ├── ProductForm.tsx
│   │       ├── CategoryForm.tsx
│   │       ├── PromotionForm.tsx
│   │       ├── CouponForm.tsx
│   │       └── OrderDetails.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useCart.ts
│   │   ├── useProduct.ts
│   │   ├── useOrder.ts
│   │   ├── useSearch.ts
│   │   └── usePayment.ts
│   ├── stores/
│   │   ├── authStore.ts
│   │   ├── cartStore.ts
│   │   ├── uiStore.ts
│   │   └── filterStore.ts
│   ├── services/
│   │   ├── api.ts              # Axios client
│   │   ├── auth.service.ts
│   │   ├── product.service.ts
│   │   ├── cart.service.ts
│   │   ├── order.service.ts
│   │   ├── payment.service.ts
│   │   └── search.service.ts
│   ├── types/
│   │   ├── api.ts              # Types de respostas da API
│   │   ├── entities.ts         # Product, Order, User, etc
│   │   ├── forms.ts            # Form inputs
│   │   └── global.ts           # Globais
│   ├── utils/
│   │   ├── formatting.ts       # moeda, data, etc
│   │   ├── validation.ts       # email, password, etc
│   │   ├── localStorage.ts     # persistência
│   │   └── constants.ts        # API_URL, etc
│   ├── config/
│   │   ├── api.config.ts
│   │   ├── auth.config.ts
│   │   └── payment.config.ts
│   └── middleware.ts           # Auth middleware
├── next.config.js
├── tsconfig.json
├── tailwind.config.ts
└── package.json
```

### 1.2 Stack Versões

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.3.0",
    "typescript": "^5.3.0",
    "zustand": "^4.4.0",
    "@tanstack/react-query": "^5.0.0",
    "axios": "^1.6.0",
    "@stripe/react-stripe-js": "^2.0.0",
    "@stripe/stripe-js": "^2.0.0",
    "tailwindcss": "^3.4.0",
    "@shadcn/ui": "latest",
    "zod": "^3.22.0",
    "react-hook-form": "^7.48.0",
    "date-fns": "^2.30.0",
    "clsx": "^2.0.0",
    "sonner": "^1.2.0"
  }
}
```

---

## 2. STATE MANAGEMENT (Zustand)

### 2.1 Auth Store

```typescript
// src/stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  fullName: string;
  isEmailVerified: boolean;
  role: 'customer' | 'admin';
}

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: user !== null,
        }),

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
```

### 2.2 Cart Store

```typescript
// src/stores/cartStore.ts
interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  priceSnapshot: number;
}

interface CartStore {
  cartId: string | null;
  guestCartId: string | null;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  total: number;
  isLoading: boolean;
  error: string | null;
  rowVersion: number;

  // Actions
  setCartId: (cartId: string) => void;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateItemQuantity: (productId: string, quantity: number) => void;
  setItems: (items: CartItem[]) => void;
  setTotal: (subtotal: number, discountAmount: number) => void;
  clear: () => void;
  setRowVersion: (version: number) => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      cartId: null,
      guestCartId: null,
      items: [],
      subtotal: 0,
      discountAmount: 0,
      total: 0,
      isLoading: false,
      error: null,
      rowVersion: 0,

      setCartId: (cartId) => set({ cartId }),
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find(
            (i) => i.productId === item.productId
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i
              ),
            };
          }
          return { items: [...state.items, item] };
        }),
      
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),

      updateItemQuantity: (productId, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, quantity } : i
          ),
        })),

      setItems: (items) => set({ items }),
      setTotal: (subtotal, discountAmount) =>
        set({
          subtotal,
          discountAmount,
          total: subtotal - discountAmount,
        }),
      clear: () =>
        set({
          cartId: null,
          items: [],
          subtotal: 0,
          discountAmount: 0,
          total: 0,
          rowVersion: 0,
        }),
      setRowVersion: (version) => set({ rowVersion: version }),
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({
        guestCartId: state.guestCartId,
        items: state.items,
      }),
    }
  )
);
```

---

## 3. PÁGINAS PRINCIPAIS

### 3.1 Home Page (`app/page.tsx`)

**Componentes:**
- Hero banner com CTA (Shop Now)
- Featured products (grid)
- Categories showcase
- Newsletter signup
- Footer

**Features:**
- Servidor-side rendering (SSR)
- Meta tags (SEO)
- Analytics tracking

### 3.2 Products Listing (`app/(shop)/products/page.tsx`)

**Componentes:**
- SearchBar com suggestions
- Filters sidebar (categoria, preço)
- Sort options (relevância, preço)
- Product grid com pagination
- Loading skeleton

**Features:**
- Search com debounce
- Filtros multi-select
- Infinite scroll ou pagination
- Cache com React Query

**Query Params:**
```
/products?q=t-shirt&category=shirts&minPrice=10&maxPrice=100&sort=price_asc&page=1
```

### 3.3 Product Detail (`app/(shop)/products/[id]/page.tsx`)

**Componentes:**
- Image gallery (swiper)
- Product info (nome, preço, avaliação)
- Variações (tamanho, cor) - se aplicável
- Stock status
- Add to cart button
- Related products
- Reviews (opcional)

**Features:**
- Zoom de imagem
- Image lazy loading
- Stock check antes de add
- Dynamic routing

### 3.4 Cart Page (`app/(shop)/cart/page.tsx`)

**Componentes:**
- Cart items list (remove, qty update)
- Promotions applied
- Coupon input
- Order summary (subtotal, tax, discount, total)
- Proceed to checkout button
- Continue shopping link

**Features:**
- Update quantity com debounce
- Apply coupon com validation
- Remove item com confirmação
- Real-time total recalculation
- Empty cart state

**Behaviors:**
- Se item sem estoque → mostrar badge
- Se promoção expirou → remover
- Se preço mudou → avisar user

### 3.5 Checkout Page (`app/(shop)/checkout/page.tsx`)

**Multi-step form:**

**Step 1: Shipping Address**
- Form fields: name, address, city, state, zip, phone
- Validation com Zod
- Save address checkbox

**Step 2: Payment Method**
- Radio buttons: credit card, PIX, boleto
- Stripe form para credit card
- Mercado Pago integration para PIX/boleto
- PayPal redirect option

**Step 3: Review & Confirm**
- Order summary
- Recap de dados
- Apply coupon
- Confirm button

**Features:**
- Progress bar
- Form persistence (localStorage)
- Back button mantém dados
- Validation feedback
- Loading states durante submit
- Error handling com retry

**Payment Integration:**
```typescript
// Exemplo de flow
if (method === 'credit_card') {
  // Stripe.js handleCardElement + confirmCardPayment
  const { paymentIntent } = await stripe.confirmCardPayment(clientSecret);
} else if (method === 'pix') {
  // Redirect para Mercado Pago
  window.location.href = paymentUrl;
} else if (method === 'paypal') {
  // Redirect para PayPal
  window.location.href = paypalRedirectUrl;
}
```

### 3.6 Order Confirmation (`app/(shop)/order-confirmation/[id]/page.tsx`)

**Componentes:**
- Success badge/icon
- Order ID
- Order items (readonly)
- Shipping address
- Estimated delivery
- Next steps (confirmar email, status tracking)
- Download invoice button

### 3.7 User Orders (`app/(user)/orders/page.tsx`)

**Componentes:**
- Orders list (recent first)
- Status badge (pending, completed, shipped)
- Order date
- Total amount
- View detail link

**Features:**
- Pagination
- Filter por status
- Search por order ID
- Track shipment

### 3.8 User Profile (`app/(user)/profile/page.tsx`)

**Componentes:**
- Edit personal info form
- Change password form
- Saved addresses
- Saved payment methods

### 3.9 Device Sessions (`app/(user)/sessions/page.tsx`)

**Componentes:**
- Sessions table (device name, IP, last activity)
- Logout from device button
- Logout everywhere button

### 3.10 Admin Dashboard (`app/(admin)/dashboard/page.tsx`)

**Componentes:**
- KPI cards (total orders, revenue, conversion)
- Sales chart (últimos 30 dias)
- Top products
- Recent orders

### 3.11 Admin Products (`app/(admin)/products/page.tsx`)

**Componentes:**
- Products table (SKU, name, price, stock, actions)
- Add product button → modal/form
- Edit product
- Delete product com confirmação
- Bulk upload

**Features:**
- Pagination
- Search por SKU/nome
- Filter por active/inactive
- Sorting

### 3.12 Admin Orders (`app/(admin)/orders/page.tsx`)

**Componentes:**
- Orders table (ID, user, status, amount, date)
- Status badge
- Update status dropdown
- View detail modal
- Cancel order button

**Features:**
- Filter por status
- Date range filter
- Search por order ID

---

## 4. AUTHENTICATION FLOW

### 4.1 Register Flow

```
┌─────────────────────────────────────┐
│ Register Page                       │
├─────────────────────────────────────┤
│ POST /api/v1/auth/register          │
│ { email, password, fullName }       │
└────────┬────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ Backend:                            │
│ - Hash password                     │
│ - Create user (isEmailVerified:0)   │
│ - Generate verification token      │
│ - Send email                        │
└────────┬────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ Frontend:                           │
│ - Show: "Check your email"          │
│ - Navigate to verify-email page     │
└────────┬────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ User clicks email link              │
│ GET /verify-email?token=...&email=..│
└────────┬────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ Backend:                            │
│ POST /api/v1/auth/verify-email      │
│ { token }                           │
│ - Validate token (not expired)      │
│ - Update user.isEmailVerified=true  │
│ - Invalidate token                  │
└────────┬────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ Frontend:                           │
│ - Show: "Email verified"            │
│ - Redirect to login                 │
└─────────────────────────────────────┘
```

### 4.2 Login Flow

```
┌─────────────────────────────────────┐
│ Login Page (email + password)        │
└────────┬────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ POST /api/v1/auth/login             │
│ { email, password, deviceId }       │
└────────┬────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ Backend:                            │
│ - Validate credentials              │
│ - Check isEmailVerified             │
│ - Generate JWT accessToken (1h)     │
│ - Generate refreshToken (7d)        │
│ - Create session (deviceId)         │
│ - Return tokens                     │
└────────┬────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ Frontend:                           │
│ - Store accessToken in memory       │
│ - Store refreshToken in httpOnly cookie
│ - Update authStore.user             │
│ - Redirect to home/dashboard        │
│ - Merge guest cart to user cart     │
└─────────────────────────────────────┘
```

### 4.3 Token Refresh Flow

```
┌────────────────────────────────────────────┐
│ API Call (accessToken expired)             │
│ 401 Unauthorized                           │
└────────┬─────────────────────────────────┘
         ↓
┌────────────────────────────────────────────┐
│ Axios interceptor detects 401              │
│ POST /api/v1/auth/refresh-token            │
│ { refreshToken }                           │
└────────┬─────────────────────────────────┘
         ↓
┌────────────────────────────────────────────┐
│ Backend:                                   │
│ - Validate refreshToken                    │
│ - Check for reuse (family tracking)        │
│ - If reuse detected → revoke family + 401  │
│ - Generate new accessToken                 │
│ - Rotate refreshToken                      │
│ - Return new tokens                        │
└────────┬─────────────────────────────────┘
         ↓
┌────────────────────────────────────────────┐
│ Frontend:                                  │
│ - Store new tokens                         │
│ - Retry original request                   │
│ - Complete API call                        │
└────────────────────────────────────────────┘
```

### 4.4 Logout Flow

```
┌─────────────────────────────────────┐
│ User clicks Logout                  │
└────────┬────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ Frontend:                           │
│ POST /api/v1/auth/logout            │
│ { deviceId? } (optional)            │
└────────┬────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ Backend:                            │
│ - Revoke refreshToken(s)            │
│ - Clear session(s)                  │
└────────┬────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ Frontend:                           │
│ - Clear tokens                      │
│ - Clear authStore                   │
│ - Clear cartStore                   │
│ - Redirect to home                  │
└─────────────────────────────────────┘
```

---

## 5. PAYMENT INTEGRATION

### 5.1 Payment Flow Architecture

```
┌──────────────────────────────────────────────────────┐
│ Frontend (Checkout)                                  │
│ ┌────────────────────────────────────────────────┐  │
│ │ User selects payment method                    │  │
│ │ - Credit Card (Stripe)                         │  │
│ │ - PIX / Boleto (Mercado Pago)                  │  │
│ │ - PayPal                                       │  │
│ └────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
                          ↓
        ┌─────────────────┼─────────────────┐
        ↓                 ↓                 ↓
   ┌──────────┐    ┌──────────┐     ┌──────────┐
   │ Stripe   │    │ Mercado  │     │ PayPal   │
   │ Flow 1   │    │ Pago 2   │     │ Flow 3   │
   └──────────┘    └──────────┘     └──────────┘
```

### 5.2 Flow 1: Stripe (Credit Card)

```typescript
// app/(shop)/checkout/PaymentForm.tsx

const PaymentForm = () => {
  const [clientSecret, setClientSecret] = useState('');
  const stripe = useStripe();
  const elements = useElements();

  // 1. Obter clientSecret do backend
  useEffect(() => {
    const initPayment = async () => {
      const response = await fetch('/api/v1/payments/create-intent', {
        method: 'POST',
        body: JSON.stringify({ orderId, amount: total }),
      });
      const { clientSecret } = await response.json();
      setClientSecret(clientSecret);
    };
    initPayment();
  }, []);

  // 2. Confirmar pagamento
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error, paymentIntent } = await stripe!.confirmCardPayment(
      clientSecret,
      {
        payment_method: {
          card: elements!.getElement(CardElement)!,
          billing_details: { email: user.email },
        },
      }
    );

    if (error) {
      showError(error.message);
    } else if (paymentIntent.status === 'succeeded') {
      // 3. Backend recebe webhook → order status → PAID
      redirectToConfirmation(orderId);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardElement />
      <button type="submit">Pay ${total}</button>
    </form>
  );
};
```

### 5.3 Flow 2: Mercado Pago (PIX/Boleto)

```typescript
// app/(shop)/checkout/MercadoPagoForm.tsx

const MercadoPagoForm = () => {
  const handlePayment = async () => {
    // 1. Criar preferência no backend
    const response = await fetch('/api/v1/payments/mercado-pago/create', {
      method: 'POST',
      body: JSON.stringify({ orderId, amount: total }),
    });
    const { preferenceId, paymentUrl } = await response.json();

    // 2. Redirect para Mercado Pago
    window.location.href = paymentUrl;
  };

  return (
    <button onClick={handlePayment}>
      Pagar com Mercado Pago
    </button>
  );
};
```

**Return URL:**
```
GET /payment-return?orderId=...&status=success|failure&preference_id=...
```

### 5.4 Flow 3: PayPal

```typescript
// Usar PayPal Buttons via SDK

import { PayPalButtons } from '@paypal/checkout-js';

const PayPalPayment = () => {
  return (
    <PayPalButtons
      createOrder={async () => {
        // Backend cria order no PayPal
        const response = await fetch('/api/v1/payments/paypal/create-order', {
          method: 'POST',
          body: JSON.stringify({ orderId, amount: total }),
        });
        const { orderID } = await response.json();
        return orderID;
      }}
      onApprove={async (data) => {
        // Backend captura payment
        const response = await fetch('/api/v1/payments/paypal/capture', {
          method: 'POST',
          body: JSON.stringify({ orderID: data.orderID }),
        });
        // Webhook atualiza status
        redirectToConfirmation(orderId);
      }}
      onError={(err) => {
        showError('PayPal payment failed');
      }}
    />
  );
};
```

---

## 6. API CLIENT (Axios)

### 6.1 Setup e Interceptors

```typescript
// src/services/api.ts
import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true, // Para cookies com refreshToken
});

// Request interceptor
api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Response interceptor (refresh token rotation)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { refreshToken } = useAuthStore.getState();
        const response = await axios.post('/api/v1/auth/refresh-token', {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;
        useAuthStore.getState().setTokens(accessToken, newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (err) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

### 6.2 Service Modules

```typescript
// src/services/product.service.ts
import api from './api';

export const productService = {
  getAll: (params: SearchParams) =>
    api.get('/products', { params }).then(r => r.data),

  getById: (id: string) =>
    api.get(`/products/${id}`).then(r => r.data),

  search: (query: string, params: SearchParams) =>
    api.get('/search/products', { params: { q: query, ...params } })
      .then(r => r.data),

  getSuggestions: (query: string) =>
    api.get(`/search/suggest?query=${query}`).then(r => r.data),
};

// src/services/cart.service.ts
export const cartService = {
  getCart: (cartId: string) =>
    api.get(`/cart/${cartId}`).then(r => r.data),

  addItem: (cartId: string, productId: string, quantity: number, idempotencyKey: string) =>
    api.post(`/cart/${cartId}/items`, {
      productId,
      quantity,
      idempotencyKey,
    }).then(r => r.data),

  updateItem: (cartId: string, itemId: string, quantity: number, rowVersion: number) =>
    api.put(`/cart/${cartId}/items/${itemId}`, {
      quantity,
      rowVersion, // Para concorrência otimista
    }).then(r => r.data),

  removeItem: (cartId: string, itemId: string) =>
    api.delete(`/cart/${cartId}/items/${itemId}`).then(r => r.data),

  applyCoupon: (cartId: string, code: string) =>
    api.post(`/cart/${cartId}/coupons`, { code }).then(r => r.data),
};

// src/services/order.service.ts
export const orderService = {
  create: (data: CreateOrderRequest) =>
    api.post('/orders', data).then(r => r.data),

  getById: (id: string) =>
    api.get(`/orders/${id}`).then(r => r.data),

  getMyOrders: (params?: PaginationParams) =>
    api.get('/orders', { params }).then(r => r.data),

  checkout: (cartId: string, provider: PaymentProvider, shippingAddress: Address) =>
    api.post('/checkout', { cartId, provider, shippingAddress })
      .then(r => r.data),
};
```

---

## 7. CUSTOM HOOKS

### 7.1 useCart

```typescript
// src/hooks/useCart.ts
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { useQuery, useMutation } from '@tanstack/react-query';
import { cartService } from '@/services/cart.service';
import { v4 as uuidv4 } from 'uuid';

export const useCart = () => {
  const cartStore = useCartStore();
  const { user } = useAuthStore();

  // Fetch cart
  const { data: cart, isLoading } = useQuery({
    queryKey: ['cart', cartStore.cartId],
    queryFn: () => cartService.getCart(cartStore.cartId!),
    enabled: !!cartStore.cartId,
  });

  // Add item mutation
  const addItemMutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) => {
      const idempotencyKey = uuidv4(); // Para evitar duplicação
      return cartService.addItem(
        cartStore.cartId!,
        productId,
        quantity,
        idempotencyKey
      );
    },
    onSuccess: (data) => {
      cartStore.setItems(data.items);
      cartStore.setTotal(data.subtotal, data.discount);
      cartStore.setRowVersion(data.rowVersion);
    },
    onError: (error: AxiosError) => {
      if (error.response?.status === 409) {
        // Concurrency conflict
        showError('Cart was modified. Refreshing...');
        queryClient.invalidateQueries({ queryKey: ['cart'] });
      }
    },
  });

  return {
    items: cartStore.items,
    total: cartStore.total,
    isLoading,
    addItem: addItemMutation.mutate,
    removeItem: (productId: string) =>
      cartService.removeItem(cartStore.cartId!, productId),
    applyCoupon: (code: string) =>
      cartService.applyCoupon(cartStore.cartId!, code),
  };
};
```

### 7.2 useAuth

```typescript
// src/hooks/useAuth.ts
export const useAuth = () => {
  const authStore = useAuthStore();
  const router = useRouter();

  const loginMutation = useMutation({
    mutationFn: (data: LoginRequest) =>
      authService.login(data, getDeviceId()),
    onSuccess: (data) => {
      authStore.setUser(data.user);
      authStore.setTokens(data.accessToken, data.refreshToken);
      router.push('/');
      // Merge guest cart
      mergeGuestCart(data.user.id);
    },
  });

  const registerMutation = useMutation({
    mutationFn: authService.register,
    onSuccess: () => {
      showSuccess('Check your email to verify');
      router.push('/verify-email');
    },
  });

  const logout = () => {
    authService.logout();
    authStore.logout();
    router.push('/login');
  };

  return {
    user: authStore.user,
    isAuthenticated: authStore.isAuthenticated,
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout,
  };
};
```

---

## 8. COMPONENTS EXEMPLO

### 8.1 SearchBar com Sugestões

```typescript
// src/components/search/SearchBar.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSearch } from '@/hooks/useSearch';
import debounce from 'lodash/debounce';

export const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { suggestions, isLoading } = useSearch(query);

  const handleSearch = debounce((value: string) => {
    setQuery(value);
  }, 300);

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Search products..."
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={() => setShowSuggestions(true)}
        className="w-full px-4 py-2 border rounded-lg"
      />

      {showSuggestions && (
        <div className="absolute top-full mt-2 w-full bg-white border rounded-lg shadow-lg">
          {isLoading ? (
            <div className="p-4">Loading...</div>
          ) : (
            <>
              {suggestions.products.map((product) => (
                <div
                  key={product.id}
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => router.push(`/products/${product.id}`)}
                >
                  {product.name} - ${product.price}
                </div>
              ))}
              {suggestions.categories.map((category) => (
                <div
                  key={category.id}
                  className="p-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-500"
                  onClick={() =>
                    router.push(`/products?category=${category.id}`)
                  }
                >
                  Category: {category.name}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};
```

### 8.2 Cart Item Component

```typescript
// src/components/cart/CartItem.tsx
'use client';

import { useState } from 'react';
import { useCart } from '@/hooks/useCart';
import debounce from 'lodash/debounce';

interface CartItemProps {
  item: CartItem;
  cartId: string;
  rowVersion: number;
}

export const CartItem = ({ item, cartId, rowVersion }: CartItemProps) => {
  const [quantity, setQuantity] = useState(item.quantity);
  const [isUpdating, setIsUpdating] = useState(false);
  const { updateItem, removeItem } = useCart();

  const handleQuantityChange = debounce((newQuantity: number) => {
    setIsUpdating(true);
    updateItem(
      { productId: item.productId, quantity: newQuantity, rowVersion },
      {
        onSuccess: () => setIsUpdating(false),
        onError: (error) => {
          if (error.response?.status === 409) {
            // Concurrency conflict - refresh cart
            toast.error('Cart was modified. Refreshing...');
          }
          setQuantity(item.quantity); // Revert
          setIsUpdating(false);
        },
      }
    );
  }, 500);

  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg">
      <img src={item.image} alt={item.name} className="w-24 h-24 object-cover" />
      <div className="flex-1">
        <h3 className="font-semibold">{item.name}</h3>
        <p className="text-gray-600">${item.price}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            const newQty = quantity - 1;
            setQuantity(newQty);
            handleQuantityChange(newQty);
          }}
          disabled={quantity <= 1 || isUpdating}
        >
          -
        </button>
        <input
          type="number"
          value={quantity}
          onChange={(e) => {
            const newQty = parseInt(e.target.value);
            setQuantity(newQty);
            handleQuantityChange(newQty);
          }}
          className="w-16 text-center"
          disabled={isUpdating}
        />
        <button
          onClick={() => {
            const newQty = quantity + 1;
            setQuantity(newQty);
            handleQuantityChange(newQty);
          }}
          disabled={isUpdating}
        >
          +
        </button>
      </div>
      <button
        onClick={() => removeItem(item.productId)}
        className="text-red-600 hover:text-red-800"
      >
        Remove
      </button>
    </div>
  );
};
```

---

## 9. ERROR HANDLING & LOADING STATES

### 9.1 Error Boundary

```typescript
// src/components/common/ErrorBoundary.tsx
'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-red-800 font-semibold">Something went wrong</h2>
          <p className="text-red-600 text-sm">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 9.2 Loading Skeleton

```typescript
// src/components/common/LoadingSkeleton.tsx
export const ProductCardSkeleton = () => (
  <div className="animate-pulse">
    <div className="w-full h-48 bg-gray-200 rounded-lg mb-4"></div>
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
  </div>
);
```

---

## 10. PERFORMANCE OPTIMIZATION

### 10.1 Image Optimization

```typescript
// Usar Next.js Image component
import Image from 'next/image';

<Image
  src={product.image}
  alt={product.name}
  width={300}
  height={300}
  placeholder="blur"
  blurDataURL="data:image/..." // LQIP
  quality={75}
  loading="lazy"
/>
```

### 10.2 Code Splitting

```typescript
// Dynamic imports para admin pages
import dynamic from 'next/dynamic';

const AdminDashboard = dynamic(() => import('@/pages/admin'), {
  loading: () => <Loading />,
});
```

### 10.3 Memoization

```typescript
// Prevenir re-renders desnecessários
const ProductCard = memo(({ product }: Props) => {
  return <div>{product.name}</div>;
}, (prevProps, nextProps) => 
  prevProps.product.id === nextProps.product.id
);
```

---

## 11. RESPONSIVENESS

### 11.1 Mobile-First Breakpoints

```typescript
// tailwind.config.ts
module.exports = {
  theme: {
    screens: {
      'sm': '640px',   // mobile
      'md': '768px',   // tablet
      'lg': '1024px',  // desktop
      'xl': '1280px',  // wide
    },
  },
};

// Uso em componentes
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
  {/* Product grid responsive */}
</div>
```

---

## 12. SEO & META TAGS

### 12.1 Meta Tags

```typescript
// app/products/[id]/page.tsx
export const generateMetadata = async ({
  params,
}: Props): Promise<Metadata> => {
  const product = await productService.getById(params.id);

  return {
    title: product.name,
    description: product.description.slice(0, 160),
    openGraph: {
      title: product.name,
      description: product.description,
      images: [product.images[0]?.url],
      url: `https://ecommerce.com/products/${product.id}`,
    },
  };
};
```

---

## 13. TESTING

### 13.1 Component Tests (Vitest)

```typescript
// src/components/cart/CartItem.test.ts
import { render, screen, fireEvent } from '@testing-library/react';
import { CartItem } from './CartItem';

describe('CartItem', () => {
  it('should update quantity', () => {
    const item = { productId: '1', name: 'Test', quantity: 1 };
    render(<CartItem item={item} cartId="cart1" rowVersion={0} />);

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: 2 } });

    expect(input).toHaveValue(2);
  });
});
```

---

## 14. ANALYTICS & TRACKING

### 14.1 Google Analytics

```typescript
// src/utils/analytics.ts
import { gtag } from '@next/third-parties/google';

export const trackEvent = (eventName: string, params: Record<string, any>) => {
  gtag.event(eventName, params);
};

// Exemplo
trackEvent('add_to_cart', {
  item_id: product.id,
  item_name: product.name,
  value: product.price,
});

trackEvent('purchase', {
  transaction_id: order.id,
  value: order.total,
  items: order.items,
});
```

---

## 15. DEPLOYMENT

### 15.1 Vercel Deployment

```bash
# Connect GitHub repo
# Auto-deploy on push

# Environment variables
NEXT_PUBLIC_API_URL=https://api.ecommerce.com
NEXT_PUBLIC_STRIPE_KEY=pk_live_...
NEXT_PUBLIC_MERCADOPAGO_KEY=...
```

**Build optimization:**
```bash
npm run build  # ~2-5min
npm run start  # production server
```

---

**Documentação Frontend Completa ✅**

