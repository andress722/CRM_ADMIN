# Complete Sweep Status - 2026-03-05

## Scope
Folder sweep executed over:
- `src/` (API, Application, Domain, Infrastructure)
- `admin-frontend/` (app + src + components)
- `info-tech-gamer-storefront-build/`

Excluded from analysis: generated/build artifacts (`node_modules`, `.next`, `bin`, `obj`, `tsbuildinfo`).

## What is Functional (Production-usable)

### Core ecommerce backend
- Auth flows active: register, login, refresh, logout, email verification, password reset (`src/Ecommerce.API/Controllers/AuthController.cs`).
- Products and catalog active with search/filter (`src/Ecommerce.API/Controllers/ProductsController.cs`).
- Product view metric active and persisted (`ProductView`) + product view counter increment (`ProductsController` + `ProductService.IncrementViewCountAsync`).
- Cart active with add/update/remove/clear and `AddToCart` metric (`src/Ecommerce.API/Controllers/CartController.cs`).
- Orders active with create/from-cart and status updates (`src/Ecommerce.API/Controllers/OrdersController.cs`).
- Payments active for checkout and transparent checkout, with webhook processing (`src/Ecommerce.API/Controllers/PaymentsController.cs`, `PaymentsWebhookController.cs`).

### Admin analytics and CRM requirements requested
- Signup metric active (`Signup`) on register (`AuthController`).
- Add-to-cart metric active (`AddToCart`) on cart insert (`CartController`).
- Product view counter active (`Product.ViewCount`) and analytics event (`ProductView`) (`ProductsController`, `ProductService`).
- Favorite metric active (`WishlistAdd`) (`ReviewsController`).
- Admin can view user viewed items (`GET /api/v1/admin/users/{id}/viewed-items`) (`AdminController`).
- Admin can view user favorited items (`GET /api/v1/admin/users/{id}/favorited-items`) (`AdminController`).
- Suggestion endpoint based on viewed/favorites/purchases active (`GET /api/v1/recommendations`) (`RecommendationsController`).
- CRM email for viewed-item suggestions active (`POST /api/v1/admin/crm/contacts/{id}/send-viewed-suggestions`) (`CrmController`).
- Featured products management already active (`PATCH /api/v1/admin/products/{id}/featured`) (`AdminController`).

### Reports and overview
- Admin report overview endpoint active (`GET /api/v1/admin/reports/overview`) (`AdminController`).
- Report email dispatch endpoint active (`POST /api/v1/admin/reports/overview/email`) (`AdminController`).
- CRM report overview and email dispatch active (`CrmController`).
- Background workers added for daily/weekly/monthly and operational reporting flows:
  - `AutomatedReportWorker`
  - `OperationalAlertWorker`
  - `AbandonedCartRecoveryWorker`
  - `LoyaltyCreditWorker`
  - `DataRetentionWorker`
  - `PostSalesEngagementWorker`

### Security and protection hardening
- Request throttling service added and applied in critical endpoints (`InMemoryRequestThrottleService`).
- Captcha verification service added and applied to auth/payment sensitive flows (`CaptchaVerifier`).
- Idempotency support added for checkout and webhook processing (`IdempotencyService`).
- Admin audit trail persisted via middleware (`AdminAuditMiddleware`, `AuditLogService`, `AuditLogsController`).
- Admin 2FA enforcement support in login path (`AuthController`, `TwoFactorService`).
- Consent and governance endpoints active (`UsersController` consent, `LgpdController`, `DataGovernanceService`).

### Frontend/admin integration
- Admin endpoints registry updated for audit logs and ops status (`admin-frontend/src/services/endpoints.ts`).
- Admin product details page no longer uses list simulation and now calls product detail endpoint directly (`admin-frontend/app/admin/products/[id]/page.tsx`).
- Customers page block/unblock action connected to backend endpoint (no more "em breve" button behavior) (`admin-frontend/app/customers/page.tsx`).

## Mocked / Partially Mocked / Needs De-mock

### Backend mocked or in-memory modules
1. Admin extras domain is in-memory static lists (not persisted):
- `src/Ecommerce.API/Controllers/AdminExtrasController.cs`
- Affected areas: webhooks admin list, logs, notifications, integrations, admins invite logs, coupons, banners, reports/settings/profile slices.

2. Admin operations domain partially mocked:
- `src/Ecommerce.API/Controllers/AdminOperationsController.cs`
- `abandoned-carts`, `reviews`, `rma` use static lists.
- `reconciliation`, `reservations`, `packing`, `logistics`, `movements`, `seo-search` return `Array.Empty<object>()`.

3. Legacy endpoints still mocked:
- `src/Ecommerce.API/Controllers/LegacyAdminController.cs` (static lists for abandoned carts/reviews).

4. Customer blocked status is not persisted in user model:
- `src/Ecommerce.API/Controllers/AdminController.cs` currently maps `blocked = false` on customer reads.
- Update accepts `blocked`, but there is no storage field in `User` and no enforcement middleware/rule.

5. Event processing TODO still open:
- `src/Ecommerce.Infrastructure/BackgroundServices/EventWorker.cs`
- TODO: inventory update + email/SignalR notifications after `PurchaseCompleted`.

6. Payment provider has stub fallback path:
- `src/Ecommerce.API/Program.cs` (provider selection)
- `src/Ecommerce.Infrastructure/Payments/StubPaymentGateway.cs`
- If `Payments:Provider=Stub`, gateway is simulation only.

7. Email provider default is console (non-delivery):
- `src/Ecommerce.API/appsettings.json` (`Email.Provider = Console`).

### Admin frontend mocked UI states
1. Coming-soon pages:
- `admin-frontend/app/admin/settings/page.tsx`
- `admin-frontend/app/admin/promotions/page.tsx`

2. Product image management placeholder text:
- `admin-frontend/app/admin/products/[id]/page.tsx` (`Image management coming soon`).

### Storefront mock assets
1. Mock dataset still present (appears unused in runtime, but still in repo):
- `info-tech-gamer-storefront-build/lib/mock-data.ts`

## De-mock Backlog (Priority)

### P0 (Business critical)
1. Persist and enforce customer block status
- Add `User.IsBlocked` + migration.
- Enforce in auth login and privileged operations.
- Replace hardcoded `blocked = false` in admin customer responses.

2. Replace in-memory AdminExtras with repositories/tables
- Webhooks, logs, notifications, integrations, admins, coupons, banners, reports/settings/profile.

3. Replace in-memory AdminOperations datasets
- Abandoned carts, moderation review queue, RMA queue, operational boards (packing/logistics/movements/reconciliation).

### P1 (Operational reliability)
1. Close `EventWorker` TODO with real handlers (inventory + notifications).
2. Move Email provider from `Console` to SendGrid/SES in production env.
3. Keep `Payments:Provider=MercadoPago` in production and protect against accidental Stub config.

### P2 (UX/Completeness)
1. Implement `/admin/settings` and `/admin/promotions` pages with full CRUD flows.
2. Implement product image management flow in admin product details page.
3. Remove dead `mock-data.ts` if confirmed unused.

## New/Updated Implementation in this cycle
- Added audit, idempotency, loyalty, governance entities/services/controllers/middleware/workers.
- Added anti-abuse and captcha protections in auth and payments.
- Added transparent checkout protection (throttle + captcha + idempotency).
- Added user consent, loyalty balance, NPS endpoints.
- Added recommendations hybrid logic (views + favorites + purchases).
- Added CRM endpoint to email viewed-item suggestions.
- Added report/alert/data-retention scheduling workers.

## Validation
Executed successfully:
- `dotnet build src/Ecommerce.API/Ecommerce.API.csproj --no-restore -v minimal`
- `npm run build` in `admin-frontend`

Current known warning:
- `src/Ecommerce.API/Controllers/AdminController.cs` nullability warning at Guid.Parse mapping (CS8622).
