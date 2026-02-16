# InfoTechGamer Ecommerce - Single Source of Truth

## 1) Purpose
This document replaces all prior scattered docs. It defines the essential scope, architecture, runtime setup, API contract, and delivery criteria for the InfoTechGamer ecommerce system (backend + storefront + admin).

## 2) What Must Exist (Essential Scope)
- Backend API (ASP.NET Core): src/Ecommerce.API
- Domain and business logic: src/Ecommerce.Domain, src/Ecommerce.Application, src/Ecommerce.Infrastructure
- Storefront (Next.js): storefront/
- Admin UI (Next.js): admin-frontend/
- Tests: tests/Ecommerce.API.Tests

## 3) Backend Architecture (Reality in Repo)
- Solution: src/Ecommerce.sln
- API: src/Ecommerce.API (Program.cs, Controllers, Services, appsettings)
- Domain: src/Ecommerce.Domain (Entities)
- Application: src/Ecommerce.Application (services, DTOs, use cases)
- Infrastructure: src/Ecommerce.Infrastructure (EF Core, repositories, integrations)

## 4) Frontend Architecture
### Storefront (Customer)
- App: storefront/
- Core pages: /, /product, /cart, /checkout, /wishlist, /account, /dashboard, /profile, /track-order
- Responsibilities: product discovery, cart, checkout, account, wishlist

### Admin (Operations)
- App: admin-frontend/
- Responsibilities: orders, users, products, admin analytics

## 5) Environments and Base URLs
- Backend base URL: NEXT_PUBLIC_API_URL (default http://localhost:5071)
- API base path: /api/v1
- Swagger: http://localhost:5071/swagger

## 6) API Contract (Storefront)
### Auth and Session
- POST /auth/login
  - Request: { email, password }
  - Response: { accessToken, refreshToken }
- POST /auth/register
  - Request: { email, password, name }
  - Response: { accessToken?, refreshToken? }
- POST /auth/forgot-password
  - Request: { email }
- POST /auth/resend-verification
  - Request: { email }
- POST /auth/verify-email
  - Request: { token }
- POST /auth/refresh
  - Request: { refreshToken }
  - Response: { accessToken, refreshToken }
- POST /auth/social/:provider
  - Request: { providerUserId, email, name }
  - Response: { accessToken, refreshToken }

### Products and Discovery
- GET /products/search
  - Query: query?, category?, minPrice?, maxPrice?, page?, pageSize?
  - Response: { items: Product[], total: number }
- GET /products/:id
  - Response: Product
- GET /recommendations
  - Response: ProductSummary[]

### User and Orders
- GET /users/me -> User
- PUT /users/me -> User
- GET /users/me/orders -> Order[]
- GET /users/me/stats -> { orders, spent, favorites, reviews }
- GET /orders/:id -> OrderWithHistory

### Support and Subscriptions
- POST /support/tickets
  - Request: { email, subject, message }
- POST /subscriptions
  - Request: { plan, email }

### Analytics
- POST /analytics/events
  - Request: { userId, type, category, action, label, value, url }

### Data Shapes
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
- history?: Array<{ date, status }>
- items?: Array<{ id, name, qty }>
- estimatedDelivery?: string

## 7) Storefront UX Requirements (Minimum)
- Home: hero + catalog + filters + recommendations + trust signals
- Product: gallery + price + add to cart + wishlist + suggestions
- Cart: items + quantity + subtotal + checkout CTA
- Checkout: address + payment + order summary
- Account: login/register/forgot
- Dashboard: stats + shortcuts
- Profile: personal data + addresses + order history
- Wishlist: personal + share view
- Track order: order id + status history

## 8) Admin UX Requirements (Minimum)
- Dashboard KPIs
- Products CRUD
- Orders list + status update
- Users list

## 9) Runbook (Local)
### Backend
- cd src/Ecommerce.API
- dotnet run
- API: http://localhost:5071
- Swagger: http://localhost:5071/swagger

### Storefront
- cd storefront
- npm install
- npm run dev
- Storefront: http://localhost:3006

### Admin
- cd admin-frontend
- npm install
- npm run dev
- Admin: http://localhost:3000

## 10) Security and Compliance (Minimum)
- JWT auth with refresh tokens
- HTTPS in production
- No raw card data stored (tokenize payments)
- LGPD/GDPR considerations for user data

## 11) Definition of Done
- Backend + Storefront + Admin all build and run
- All required routes functional end to end
- API contract matches frontend usage
- Error and empty states covered

## 12) Consolidated Sources (Removed)
This file replaces the previous documents scattered across the repo. If any missing requirement is found, update this file as the only source of truth.
