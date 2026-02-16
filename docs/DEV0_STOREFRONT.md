# InfoTechGamer Storefront - Dev0 Handoff (Complete)

## 1) Goal
Build a complete, modern, attractive storefront experience for InfoTechGamer. This is the customer-facing app. The "admin" area here is a user account hub for purchases, addresses, and personal data (not a backoffice).

## 2) Design Direction
- Modern, premium, minimal aesthetic.
- Warm neutral palette with strong contrast and clean typography.
- Emphasis on product discovery, trust, and conversion.

## 3) Non-Negotiable Features
- Login / Register / Forgot Password
- Cart and Checkout
- Product catalog and product detail page
- Product suggestions / recommendations
- Wishlist (personal + shareable list)
- User account area (orders, addresses, profile data)
- Order tracking

## 4) Information Architecture (Routes)
- / : Home / catalog landing
- /product?id=... : Product detail page
- /cart : Cart
- /checkout : Checkout
- /wishlist : Public wishlist view (shared by query param)
- /account : Login / register / account entry
- /dashboard : User dashboard (stats)
- /profile : User profile + orders + addresses
- /track-order : Order tracking
- /support : Support ticket form
- /subscriptions : Subscription plans
- /privacy : Privacy (LGPD)
- /verify-email : Email verification
- /debug-payment : Debug payment view (dev only)

## 5) Core User Flows
### 5.1 Auth
- Entry: /account
- States: login, register, forgot password, resend verification.
- Success: redirect to /dashboard or previous route.

### 5.2 Catalog + Product
- Home: search, category filter, min/max price, pagination.
- Product detail: pricing, images, add to cart, add to wishlist.

### 5.3 Cart + Checkout
- /cart: list, quantities, remove, subtotal, CTA to checkout.
- /checkout: address, payment, confirmation.

### 5.4 Wishlist
- Personal: toggle in catalog and product detail.
- Share: /wishlist?data=... (encoded JSON list).

### 5.5 User Account Hub ("Admin")
- /dashboard: quick stats, last order, shortcuts.
- /profile: personal data, saved addresses, order history.

### 5.6 Order Tracking
- /track-order: search by order ID, view status history.

## 6) UX Requirements (Per Page)
### Home (/)
- Hero with clear value prop, primary CTA, secondary CTA.
- Section for trust signals (delivery, warranty, sellers).
- Catalog module with search + filters + pagination.
- Recommendations module.

### Product (/product)
- Gallery, title, price, reviews summary, stock badge.
- Add to cart and wishlist CTAs.
- Suggested products beneath.

### Cart (/cart)
- Item list, remove/edit quantity, subtotal.
- CTA to checkout.

### Checkout (/checkout)
- Shipping address, payment selection, order summary.
- Clear error and success states.

### Account (/account)
- Login/register/forgot in one module with minimal friction.

### Dashboard (/dashboard)
- Stats: orders, total spent, favorites, reviews.
- Quick access to profile and orders.

### Profile (/profile)
- Personal data + addresses + order history table.

### Wishlist (/wishlist)
- Public list, grid of items, CTA to product page.

### Track Order (/track-order)
- Input for order ID, results card with status history.

### Support (/support)
- Simple ticket form with confirmation message.

### Subscriptions (/subscriptions)
- Plans with benefits, clear pricing and CTA.

## 7) Design System (High Level)
### Typography
- Headings: editorial serif.
- Body: clean sans.

### Color
- Warm neutral background.
- High contrast text.
- Single accent color for CTA.

### Layout
- Max width 1200px, generous whitespace.
- Cards with subtle shadow and rounded corners.

## 8) Component List (Must Build)
- Header + nav + cart shortcut
- Footer
- Product card
- Search + filter controls
- Pagination
- Recommendation grid
- Wishlist button
- Cart summary
- Checkout form
- Account auth form
- Order tracking card

## 9) API Endpoints Used (Current)
### Base URL and Versioning
- Base URL: NEXT_PUBLIC_API_URL (default: http://localhost:5071)
- All endpoints are called under /api/v1
- Example: http://localhost:5071/api/v1

### Auth and Session
- /auth/login (POST)
	- Request: { "email": string, "password": string }
	- Response 200: { "accessToken": string, "refreshToken": string }
- /auth/register (POST)
	- Request: { "email": string, "password": string, "name": string }
	- Response 200: { "accessToken"?: string, "refreshToken"?: string }
- /auth/forgot-password (POST)
	- Request: { "email": string }
	- Response 200: { "message"?: string }
- /auth/resend-verification (POST)
	- Request: { "email": string }
	- Response 200: { "message"?: string }
- /auth/verify-email (POST)
	- Request: { "token": string }
	- Response 200: { "message"?: string }
- /auth/refresh (POST)
	- Request: { "refreshToken": string }
	- Response 200: { "accessToken": string, "refreshToken": string }
- /auth/social/:provider (POST) for google, facebook
	- Request: { "providerUserId": string, "email": string, "name": string }
	- Response 200: { "accessToken": string, "refreshToken": string }

### Products and Discovery
- /products/search (GET)
	- Query: query?, category?, minPrice?, maxPrice?, page?, pageSize?
	- Response 200: { "items": Product[], "total": number }
- /products/:id (GET)
	- Response 200: Product
- /recommendations (GET)
	- Response 200: ProductSummary[]

### User and Orders
- /users/me (GET)
	- Response 200: User
- /users/me (PUT)
	- Request: Partial<User>
	- Response 200: User
- /users/me/orders (GET)
	- Response 200: Order[]
- /users/me/stats (GET)
	- Response 200: { "orders": number, "spent": number, "favorites": number, "reviews": number }
- /orders/:id (GET)
	- Response 200: OrderWithHistory

### Support and Subscriptions
- /support/tickets (POST)
	- Request: { "email": string, "subject": string, "message": string }
	- Response 200: { "message"?: string }
- /subscriptions (POST)
	- Request: { "plan": string, "email": string }
	- Response 200: { "message"?: string }

### Analytics
- /analytics/events (POST)
	- Request: { "userId": string | null, "type": string, "category": string, "action": string, "label": string, "value": number, "url": string | null }
	- Response 200: { "message"?: string }

### Auth Header and Token Storage
- accessToken and refreshToken are stored in localStorage
- Authorization: Bearer <accessToken> is added to API requests
- On 401, the frontend calls /auth/refresh and retries

### Data Shapes (Derived)
Product:
- id: string
- name: string
- price: number
- imageUrl?: string
- category?: string
- rating?: number

ProductSummary:
- id: string
- name: string
- price: number
- imageUrl?: string

User:
- name: string
- email: string
- phone?: string
- address?: string

Order:
- id: string
- date?: string
- total?: number
- status?: string

OrderWithHistory:
- id: string
- status: string
- carrier?: string
- updated?: string
- history?: Array<{ "date": string, "status": string }>
- items?: Array<{ "id": string, "name": string, "qty": number }>
- estimatedDelivery?: string

## 10) States and Edge Cases
- Empty states: no products, empty wishlist, empty cart.
- Loading states for all async blocks.
- Error states: invalid login, missing token, order not found.
- Form validation errors.

## 11) Content Tone
- Confident, clean, premium.
- Short sentences, action-focused CTAs.

## 12) Definition of Done
- All routes implemented with coherent UI.
- Responsive layout (mobile to desktop).
- Consistent CTA styles and spacing.
- All required flows working end to end.

## 13) Notes
- The current UI exists but is being reworked; treat as reference only.
- This document is the source of truth for the storefront experience.
- Prioritize a cohesive, polished layout for all routes above.
